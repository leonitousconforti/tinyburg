import type { Digest, Mac, SecureRandom, Signature } from "effect/crypto";

import { Config, DateTime, Duration, Effect, Exit, Layer, Option, Redacted, Result, Schema, type Scope } from "effect";
import { type HttpClient, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import type * as OpenIdConnect from "@yielded/auth/OpenIdConnect";

import * as Discord from "@yielded/auth/Discord";
import * as Google from "@yielded/auth/Google";
import * as OAuth from "@yielded/auth/OAuth";
import * as Operations from "@yielded/auth/Operations";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { CookiePolicy, PROVIDER_SESSION_COOKIE_NAME, maybeCurrentUser } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";

/**
 * A provider the app signs visitors in with, configured: `protocol` discovers
 * the provider on first use and keeps the result, so an outage at boot costs
 * the sign ins attempted during it rather than the whole server.
 */
interface SignInProvider {
    readonly name: "google" | "discord";
    readonly key: OAuth.OAuthProviderKey;
    /** The cookie the round trip rides on, from the redirect to the callback. */
    readonly cookie: string;
    readonly protocol: Effect.Effect<
        OAuth.OAuthProtocol["Service"],
        OpenIdConnect.OpenIdConnectConfigurationError | OAuth.OAuthUnavailable
    >;
}

const google = {
    name: "google",
    config: Config.all({
        clientId: Config.String("GOOGLE_CLIENT_ID"),
        clientSecret: Config.Redacted("GOOGLE_CLIENT_SECRET"),
        redirectUri: Config.String("GOOGLE_REDIRECT_URI"),
    }),
    // Google puts `name` in the ID token, so `profile` is all it takes
    define: ({ clientId, clientSecret }: { readonly clientId: string; readonly clientSecret: Redacted.Redacted }) =>
        Google.provider({ clientId, clientSecret, scopes: ["openid", "profile"] }),
} as const;

const discord = {
    name: "discord",
    config: Config.all({
        clientId: Config.String("DISCORD_CLIENT_ID"),
        clientSecret: Config.Redacted("DISCORD_CLIENT_SECRET"),
        redirectUri: Config.String("DISCORD_REDIRECT_URI"),
    }),
    // Discord's ID token carries no `name`; `identify` lets the provider read
    // the display name from its user endpoint instead
    define: ({ clientId, clientSecret }: { readonly clientId: string; readonly clientSecret: Redacted.Redacted }) =>
        Discord.provider({ clientId, clientSecret, scopes: ["openid", "identify"] }),
} as const;

/**
 * Why the browser was sent to the provider: to sign in, or to connect the
 * account to an already signed-in user. The callback reads it to know what to
 * do with the account it gets back.
 */
const OAuthIntent = Schema.Struct({
    mode: Schema.Literals(["login", "link"]),
    returnTo: Schema.optional(Schema.String),
});

/**
 * Everything the callback needs from the redirect that started the round
 * trip: the configuration it was prepared under, the state, PKCE verifier and
 * nonce it has to prove, and the intent. One cookie, httpOnly and bound to
 * this site, so nobody but this browser can finish the flow it started.
 */
const SignInFlow = Schema.fromJsonString(
    Schema.Struct({
        configuration: OAuth.OAuthProtocolConfiguration,
        secrets: OAuth.OAuthTransactionSecrets,
        intent: OAuthIntent,
    })
);

/** What a provider sends back. Anything else it appends is ignored. */
const CallbackQuery = Schema.Struct({
    state: Schema.optional(Schema.String),
    code: Schema.optional(Schema.String),
    error: Schema.optional(Schema.String),
    iss: Schema.optional(Schema.String),
});

const isLocalPath = (value: string): boolean => {
    const NOWHERE = "https://tinyburg.invalid";
    if (!value.startsWith("/")) return false;
    try {
        return new URL(value, NOWHERE).origin === NOWHERE;
    } catch {
        return false;
    }
};

const returnToParam = HttpServerRequest.schemaSearchParams(
    Schema.Struct({
        returnTo: Schema.optional(Schema.String),
    })
).pipe(
    Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
    Effect.map(Option.filter(isLocalPath)),
    Effect.option,
    Effect.map(Option.flatten)
);

const bounceToLogin = (returnTo: string) =>
    HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

const start = (provider: SignInProvider, mode: "link" | "login") =>
    Effect.gen(function* () {
        const cookiePolicy = yield* CookiePolicy;
        const returnTo = mode === "link" ? Option.none<string>() : yield* returnToParam;

        const tryMaybeCurrentUser = yield* maybeCurrentUser.pipe(Effect.option);
        if (Option.isNone(tryMaybeCurrentUser)) {
            return HttpServerResponse.redirect("/login?error=invalid_oauth_current_user");
        }

        const currentUser = tryMaybeCurrentUser.value;
        if (mode === "link" && Option.isNone(currentUser)) {
            return bounceToLogin("/account");
        }

        if (mode === "login" && Option.isSome(currentUser)) {
            return HttpServerResponse.redirect(Option.getOrElse(returnTo, () => "/towers/@me"));
        }

        const startFailed = HttpServerResponse.redirect(
            mode === "link" ? "/account?error=start_failed" : "/login?error=start_failed"
        );

        const prepared = yield* Effect.gen(function* () {
            const protocol = yield* provider.protocol;
            const flowId = yield* Schema.decodeEffect(Operations.RequestBindingFlowId)(randomSecret());
            return yield* protocol.prepareAuthorization({ provider: provider.key, flowId });
        }).pipe(Effect.option);
        if (Option.isNone(prepared)) return startFailed;

        // Remember why we are sending them, and what they have to come back with
        const flow = yield* Schema.encodeEffect(SignInFlow)({
            configuration: prepared.value.configuration,
            secrets: prepared.value.secrets,
            intent: { mode, returnTo: Option.getOrUndefined(returnTo) },
        }).pipe(Effect.orDie);

        return yield* HttpServerResponse.redirect(Redacted.value(prepared.value.authorizationUrl)).pipe(
            HttpServerResponse.setCookie(cookiePolicy.name(provider.cookie), flow, {
                httpOnly: true,
                path: "/",
                secure: cookiePolicy.secure,
                sameSite: "lax",
                maxAge: Duration.minutes(10),
            }),
            Effect.orElseSucceed(() => startFailed)
        );
    }).pipe(Effect.satisfiesErrorType<never>());

const callback = (provider: SignInProvider) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const flowCookie = cookiesPolicy.name(provider.cookie);

        // However it ends, the round trip is over
        const done = (response: HttpServerResponse.HttpServerResponse) =>
            HttpServerResponse.expireCookieUnsafe(response, flowCookie, {
                httpOnly: true,
                path: "/",
                secure: cookiesPolicy.secure,
                sameSite: "lax",
            });

        // What to do on failure
        const failed = (to: string, errorMessage: string = "oauth") =>
            done(HttpServerResponse.redirect(`${to}?error=${encodeURIComponent(errorMessage)}`));

        // We start by reading the flow cookie so that we know where to
        // redirect on errors, either login or account.
        const maybeFlow = yield* Option.match(Option.fromNullishOr(request.cookies[flowCookie]), {
            onNone: () => Effect.succeedNone,
            onSome: (raw) => Schema.decodeEffect(SignInFlow)(raw).pipe(Effect.option),
        });

        // Uh oh
        if (Option.isNone(maybeFlow)) {
            return failed("/login", "invalid_oauth_cookies");
        }

        // Make a new failed based on the intent
        const { configuration, intent, secrets } = maybeFlow.value;
        const failedRedirectByIntent = (errorMessage: string = "oauth") => {
            if (intent.mode === "link") {
                return failed("/account", errorMessage);
            } else {
                return failed("/login", errorMessage);
            }
        };

        // Parse the headers
        const maybeHeaders = yield* HttpServerRequest.schemaHeaders(
            Schema.Struct({
                "user-agent": Schema.optional(Schema.String),
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeHeaders)) {
            return failedRedirectByIntent("invalid_oauth_headers");
        }

        // Read the provider's answer: an error, or a code to exchange
        const maybeQuery = yield* HttpServerRequest.schemaSearchParams(CallbackQuery).pipe(Effect.option);
        if (Option.isNone(maybeQuery)) {
            return failedRedirectByIntent("invalid_oauth_callback");
        }

        const query = maybeQuery.value;
        if (query.error !== undefined) {
            return failedRedirectByIntent(query.error === "access_denied" ? "oauth_denied" : "invalid_oauth_provider");
        }

        const maybeResponse = yield* Schema.decodeUnknownEffect(OAuth.OAuthCodeResponse)({
            _tag: "Code",
            state: query.state,
            code: query.code,
            ...(query.iss === undefined ? {} : { issuer: query.iss }),
        }).pipe(Effect.option);
        if (Option.isNone(maybeResponse)) {
            return failedRedirectByIntent("invalid_oauth_callback");
        }

        // Check the state, exchange the code, verify the ID token
        const outcome = yield* Effect.gen(function* () {
            const protocol = yield* provider.protocol;
            return yield* protocol.exchangeVerifiedIdentity({
                configuration,
                response: maybeResponse.value,
                secrets,
                verificationStartedAt: yield* DateTime.now,
            });
        }).pipe(Effect.result);
        if (Result.isFailure(outcome)) {
            return failedRedirectByIntent(
                outcome.failure._tag === "OAuthProtocolRejected" ? "invalid_oauth_claims" : "invalid_oauth_token"
            );
        }

        // What will get inserted into the database
        const { identity, profile: display } = outcome.success;
        const displayName = display?.displayName?.trim() ?? "";
        const profile = {
            provider: provider.name,
            providerAccountId: identity.subject,
            displayName: displayName.length > 0 ? displayName : "Tinyburg player",
            avatarUrl: Option.none<string>(),
            email: Option.none<string>(),
        };

        // A link that cannot be written sends them back where they started
        // rather than to login; they are signed in, and /account is the page
        // that reports how connecting went
        if (intent.mode === "link") {
            const tryCurrentUser = yield* maybeCurrentUser.pipe(Effect.option);
            if (Option.isNone(tryCurrentUser)) {
                return failedRedirectByIntent("invalid_oauth_current_user");
            }

            const currentUser = tryCurrentUser.value;
            if (Option.isNone(currentUser)) {
                return done(bounceToLogin("/account"));
            }

            const maybeOutcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({
                    ...profile,
                    userId: currentUser.value.user.id,
                })
            ).pipe(Effect.option);
            if (Option.isNone(maybeOutcome)) {
                return done(HttpServerResponse.redirect(`/account?error=invalid_oauth_link`));
            } else {
                return done(HttpServerResponse.redirect(`/account?link=${maybeOutcome.value}`));
            }
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const maybeSignedIn = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile)).pipe(Effect.option);
        if (Option.isNone(maybeSignedIn)) {
            return failedRedirectByIntent("invalid_oauth_signin");
        }

        const userAgent = Option.fromNullishOr(maybeHeaders.value["user-agent"]).pipe(
            Option.map((value) => value.slice(0, 512))
        );

        const maybeSession = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                user: maybeSignedIn.value,
                tokenHash,
                userAgent,
                ip: Option.none(),
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeSession)) {
            return failedRedirectByIntent("invalid_oauth_session");
        }

        const returnTo = Option.fromNullishOr(intent.returnTo).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => "/towers/@me")
        );

        return yield* HttpServerResponse.redirect(returnTo).pipe(
            HttpServerResponse.setCookie(cookiesPolicy.name(PROVIDER_SESSION_COOKIE_NAME), sessionToken, {
                expires: DateTime.toDateUtc(maybeSession.value.expiresAt),
                httpOnly: true,
                path: "/",
                secure: cookiesPolicy.secure,
                sameSite: "lax",
            }),
            Effect.map(done),
            Effect.orElseSucceed(() => failedRedirectByIntent("invalid_oauth_response"))
        );
    }).pipe(Effect.satisfiesErrorType<never>());

export const OAuthRoutesLive = Effect.gen(function* () {
    const googleConfig = yield* google.config;
    const discordConfig = yield* discord.config;

    // Configuring a provider is discovery plus the clients built from it,
    // which live as long as these routes do
    const services = yield* Effect.context<
        HttpClient.HttpClient | SecureRandom.SecureRandom | Digest.Digest | Mac.Mac | Signature.Signature | Scope.Scope
    >();

    const signInWith = (
        provider: typeof google | typeof discord,
        config: Config.Success<(typeof google)["config"]>
    ): Effect.Effect<SignInProvider, Schema.SchemaError> =>
        Effect.gen(function* () {
            const key = yield* Schema.decodeEffect(OAuth.OAuthProviderKey)(provider.name);
            const callbackId = yield* Schema.decodeEffect(OAuth.OAuthCallbackId)(provider.name);
            const redirectUri = yield* Schema.decodeEffect(OAuth.OAuthRedirectUri)(config.redirectUri);

            // Kept once it works, tried again on the next sign in until it does
            const protocol = yield* Effect.cachedWithTTL(
                provider
                    .define(config)
                    .configure({ provider: key, callbacks: [{ callbackId, redirectUri }] })
                    .pipe(Effect.provideContext(services)),
                (exit) => (Exit.isSuccess(exit) ? Duration.infinity : Duration.zero)
            );

            return { name: provider.name, key, cookie: `${provider.name}_oauth_flow`, protocol };
        });

    const googleRealized = yield* signInWith(google, googleConfig);
    const discordRealized = yield* signInWith(discord, discordConfig);

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/google/login", start(googleRealized, "login")),
        HttpRouter.add("GET", "/auth/google/link", start(googleRealized, "link")),
        HttpRouter.add("GET", "/auth/google/callback", callback(googleRealized)),
        HttpRouter.add("GET", "/auth/discord/login", start(discordRealized, "login")),
        HttpRouter.add("GET", "/auth/discord/link", start(discordRealized, "link")),
        HttpRouter.add("GET", "/auth/discord/callback", callback(discordRealized))
    );
}).pipe(Layer.unwrap);

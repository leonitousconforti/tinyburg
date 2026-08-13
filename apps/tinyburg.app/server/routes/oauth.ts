import { Config, DateTime, Effect, Layer, Option, type Redacted, Schema } from "effect";
import {
    HttpClient,
    HttpClientRequest,
    HttpClientResponse,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
} from "effect/unstable/http";

import { RelyingParty } from "effect-oidc";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { CookiePolicy, PROVIDER_SESSION_COOKIE_NAME, maybeCurrentUser } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";

interface OAuthProvider {
    readonly name: "google" | "discord";
    readonly authUrl: string;
    readonly tokenUrl: string;
    readonly issuer: string;
    readonly scopes: ReadonlyArray<string>;
    readonly cookiePrefix: string;
    readonly config: Config.Config<{
        readonly clientId: string;
        readonly clientSecret: Redacted.Redacted;
        readonly redirectUri: string;
        readonly jwksUri: string;
    }>;
}

interface OAuthProviderRealized {
    readonly name: OAuthProvider["name"];
    /** The relying-party half of the code flow, realized for this provider. */
    readonly party: RelyingParty.RelyingParty;
    /**
     * Providers that do not carry a `name` claim in their ID token fetch the
     * display name from their user endpoint instead. Returning `Option.none`
     * falls back to the ID token claim, so a provider outage costs a nice
     * name rather than the whole sign in.
     */
    readonly fetchDisplayName: (accessToken: string) => Effect.Effect<Option.Option<string>>;
}

const google = {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    issuer: "https://accounts.google.com",
    scopes: ["openid", "email", "profile"],
    cookiePrefix: "google_oauth",
    config: Config.all({
        clientId: Config.string("GOOGLE_CLIENT_ID"),
        clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
        redirectUri: Config.string("GOOGLE_REDIRECT_URI"),
        jwksUri: Config.string("GOOGLE_JWKS_URI"),
    }),
} satisfies OAuthProvider;

const discord = {
    name: "discord",
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    issuer: "https://discord.com",
    scopes: ["identify", "email", "openid"],
    cookiePrefix: "discord_oauth",
    config: Config.all({
        clientId: Config.string("DISCORD_CLIENT_ID"),
        clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
        redirectUri: Config.string("DISCORD_REDIRECT_URI"),
        jwksUri: Config.string("DISCORD_JWKS_URI"),
    }),
} satisfies OAuthProvider;

/**
 * The slice of Discord's user object we care about. Discord's ID token
 * carries no `name` claim, so the display name has to come from here.
 *
 * @see https://docs.discord.com/developers/resources/user
 */
const DiscordUser = Schema.Struct({
    /** "the user's display name, if it is set" - null for accounts that never set one. */
    global_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
    /** "the user's username, not unique across the platform". */
    username: Schema.String,
});

/**
 * Reads the display name from Discord's user endpoint, which the `identify`
 * scope grants us. Any failure resolves to `Option.none` rather than
 * failing the callback.
 */
const discordDisplayName =
    (httpClient: HttpClient.HttpClient) =>
    (accessToken: string): Effect.Effect<Option.Option<string>> =>
        HttpClientRequest.get("https://discord.com/api/users/@me").pipe(
            HttpClientRequest.setHeader("authorization", `Bearer ${accessToken}`),
            HttpClient.execute,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(DiscordUser)),
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.map((user) => Option.fromNullishOr(user.global_name ?? user.username)),
            Effect.option,
            Effect.map(Option.flatten)
        );

/**
 * Why the browser was sent to the provider: to sign in, or to connect the
 * account to an already signed-in user. It rides the relying party's payload
 * cookie through the round trip, and the callback reads it to know what to
 * do with the account it gets back.
 */
const OAuthIntent = Schema.fromJsonString(
    Schema.Struct({
        mode: Schema.Literals(["login", "link"]),
        returnTo: Schema.optional(Schema.String),
    })
);

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

/**
 * The callback failure reasons, mapped onto the error strings the login and
 * account pages already know how to explain.
 */
const callbackErrorMessage: Record<RelyingParty.CallbackError["reason"], string> = {
    InvalidCallback: "invalid_oauth_callback",
    AccessDenied: "oauth_denied",
    ProviderError: "invalid_oauth_provider",
    StateMismatch: "invalid_oauth_cookies",
    ExchangeFailed: "invalid_oauth_token",
    InvalidIdToken: "invalid_oauth_claims",
};

const start = (provider: OAuthProviderRealized, mode: "link" | "login") =>
    Effect.gen(function* () {
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

        // Remember why we are sending them
        const intent = yield* Schema.encodeEffect(OAuthIntent)({
            returnTo: Option.getOrUndefined(returnTo),
            mode,
        }).pipe(Effect.orDie);

        return yield* provider.party.beginAuthorization({ payload: intent }).pipe(
            Effect.catch(() => {
                if (mode === "link") {
                    return Effect.succeed(HttpServerResponse.redirect("/account?error=start_failed"));
                } else {
                    return Effect.succeed(HttpServerResponse.redirect("/login?error=start_failed"));
                }
            })
        );
    }).pipe(Effect.satisfiesErrorType<never>());

const callback = (provider: OAuthProviderRealized) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;

        // What to do on failure
        const failed = (to: string, errorMessage: string = "oauth") => {
            const encodedErrorMessage = encodeURIComponent(errorMessage);
            const toWithError = `${to}?error=${encodedErrorMessage}`;
            return HttpServerResponse.redirect(toWithError).pipe(provider.party.expireTransactionCookies, Effect.orDie);
        };

        // We start by parsing the intent payload so that we know where to
        // redirect on errors, either login or account.
        const maybeIntent = yield* provider.party.payload.pipe(
            Effect.flatMap(
                Option.match({
                    onNone: () => Effect.succeed(Option.none<typeof OAuthIntent.Type>()),
                    onSome: (raw) => Schema.decodeEffect(OAuthIntent)(raw).pipe(Effect.option),
                })
            )
        );

        // Uh oh
        if (Option.isNone(maybeIntent)) {
            return yield* failed("/login", "invalid_oauth_intent");
        }

        // Make a new failed based on the intent
        const intent = maybeIntent.value;
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
            return yield* failedRedirectByIntent("invalid_oauth_headers");
        }

        // Validate the provider's redirect, exchange the code, verify the
        // ID token
        const outcome = yield* Effect.result(provider.party.completeAuthorization);
        if (outcome._tag === "Failure") {
            return yield* failedRedirectByIntent(callbackErrorMessage[outcome.failure.reason]);
        }

        // Providers that leave `name` out of the ID token get a second look
        // at their own user endpoint before we settle for the placeholder
        const { claims, tokens } = outcome.success;
        const fetchedName = yield* provider.fetchDisplayName(tokens.access_token);

        // What will get inserted into the database
        const profile = {
            provider: provider.name,
            providerAccountId: claims.sub,
            displayName: fetchedName.pipe(
                Option.orElse(() => Option.fromNullishOr(claims.name)),
                Option.getOrElse(() => "Tinyburg player")
            ),
            avatarUrl: Option.none<string>(),
            email: Option.none<string>(),
        };

        // A link that cannot be written sends them back where they started
        // rather than to login; they are signed in, and /account is the page
        // that reports how connecting went
        if (intent.mode === "link") {
            const tryCurrentUser = yield* maybeCurrentUser.pipe(Effect.option);
            if (Option.isNone(tryCurrentUser)) {
                return yield* failedRedirectByIntent("invalid_oauth_current_user");
            }

            const currentUser = tryCurrentUser.value;
            if (Option.isNone(currentUser)) {
                return yield* bounceToLogin("/account").pipe(provider.party.expireTransactionCookies, Effect.orDie);
            }

            const maybeOutcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({
                    ...profile,
                    userId: currentUser.value.user.id,
                })
            ).pipe(Effect.option);
            if (Option.isNone(maybeOutcome)) {
                return yield* HttpServerResponse.redirect(`/account?error=invalid_oauth_link`).pipe(
                    provider.party.expireTransactionCookies,
                    Effect.orDie
                );
            } else {
                return yield* HttpServerResponse.redirect(`/account?link=${maybeOutcome.value}`).pipe(
                    provider.party.expireTransactionCookies,
                    Effect.orDie
                );
            }
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const maybeSignedIn = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile)).pipe(Effect.option);
        if (Option.isNone(maybeSignedIn)) {
            return yield* failedRedirectByIntent("invalid_oauth_signin");
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
            return yield* failedRedirectByIntent("invalid_oauth_session");
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
            Effect.flatMap(provider.party.expireTransactionCookies),
            Effect.catch(() => failedRedirectByIntent("invalid_oauth_response"))
        );
    }).pipe(Effect.satisfiesErrorType<never>());

export const OAuthRoutesLive = Effect.gen(function* () {
    const googleConfig = yield* google.config;
    const discordConfig = yield* discord.config;
    const cookiePolicy = yield* CookiePolicy;
    const httpClient = yield* HttpClient.HttpClient;

    const relyingParty = (
        provider: OAuthProvider,
        config: Config.Success<OAuthProvider["config"]>
    ): Effect.Effect<RelyingParty.RelyingParty, never, HttpClient.HttpClient> =>
        RelyingParty.make({
            issuer: provider.issuer,
            authorizationEndpoint: provider.authUrl,
            tokenEndpoint: provider.tokenUrl,
            jwksUri: config.jwksUri,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri,
            scopes: provider.scopes,
            cookies: {
                prefix: provider.cookiePrefix,
                name: cookiePolicy.name,
                secure: cookiePolicy.secure,
            },
        });

    const googleRealized: OAuthProviderRealized = {
        name: google.name,
        party: yield* relyingParty(google, googleConfig),
        // Google puts `name` in the ID token, so there is nothing to fetch
        fetchDisplayName: () => Effect.succeed(Option.none()),
    };

    const discordRealized: OAuthProviderRealized = {
        name: discord.name,
        party: yield* relyingParty(discord, discordConfig),
        fetchDisplayName: discordDisplayName(httpClient),
    };

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/google/login", start(googleRealized, "login")),
        HttpRouter.add("GET", "/auth/google/link", start(googleRealized, "link")),
        HttpRouter.add("GET", "/auth/google/callback", callback(googleRealized)),
        HttpRouter.add("GET", "/auth/discord/login", start(discordRealized, "login")),
        HttpRouter.add("GET", "/auth/discord/link", start(discordRealized, "link")),
        HttpRouter.add("GET", "/auth/discord/callback", callback(discordRealized))
    );
}).pipe(Layer.unwrap);

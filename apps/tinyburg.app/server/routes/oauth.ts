import type { SqlError } from "effect/unstable/sql";

import { Config, DateTime, Effect, Layer, Option, Redacted, Schema } from "effect";
import { type Cookies, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { CookiePolicy, maybeCurrentUser, PROVIDER_SESSION_COOKIE_NAME, readCookie } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";

interface OAuthProvider {
    readonly name: "google" | "discord";
    readonly authUrl: string;
    readonly tokenUrl: string;
    readonly issuer: string;
    readonly scopes: ReadonlyArray<string>;
    readonly stateCookieName: string;
    readonly codeVerifierCookieName: string;
    readonly intentCookieName: string;
    readonly config: Config.Config<{
        readonly clientId: string;
        readonly clientSecret: Redacted.Redacted;
        readonly redirectUri: string;
        readonly jwksUri: string;
    }>;
}

const google = {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    issuer: "https://accounts.google.com",
    scopes: ["openid", "email", "profile"],
    stateCookieName: "google_oauth_state_tinyburg",
    codeVerifierCookieName: "google_oauth_code_verifier_tinyburg",
    intentCookieName: "google_oauth_intent_tinyburg",
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
    stateCookieName: "discord_oauth_state_tinyburg",
    codeVerifierCookieName: "discord_oauth_code_verifier_tinyburg",
    intentCookieName: "discord_oauth_intent_tinyburg",
    config: Config.all({
        clientId: Config.string("DISCORD_CLIENT_ID"),
        clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
        redirectUri: Config.string("DISCORD_REDIRECT_URI"),
        jwksUri: Config.string("DISCORD_JWKS_URI"),
    }),
} satisfies OAuthProvider;

const OAuthIntent = Schema.fromJsonString(
    Schema.Struct({
        mode: Schema.Literals(["login", "link"]),
        returnTo: Schema.optional(Schema.String),
    })
);

const returnToParam = HttpServerRequest.schemaSearchParams(
    Schema.Struct({
        returnTo: Schema.optional(Schema.String),
    })
).pipe(
    Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
    Effect.map(Option.filter((value) => value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\"))),
    Effect.option,
    Effect.map(Option.flatten)
);

const bounceToLogin = (returnTo: string) =>
    HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

const expireSpentCookies = (provider: OAuthProvider, response: HttpServerResponse.HttpServerResponse) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;
        const cookieOptions = { httpOnly: true, path: "/", secure: cookies.secure, sameSite: "lax" } as const;
        let expired = response;
        for (const base of [provider.stateCookieName, provider.codeVerifierCookieName, provider.intentCookieName]) {
            expired = yield* HttpServerResponse.expireCookie(expired, cookies.name(base), cookieOptions);
        }
        return expired;
    });

const start = (
    provider: OAuthProvider,
    mode: "link" | "login"
): Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    Cookies.CookiesError | Url.UrlError | Schema.SchemaError | Config.ConfigError | SqlError.SqlError,
    CookiePolicy | HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams | SessionsRepository
> =>
    Effect.gen(function* () {
        const config = yield* provider.config;
        const cookies = yield* CookiePolicy;

        const returnTo = mode === "link" ? Option.none<string>() : yield* returnToParam;
        if (mode === "link" && Option.isNone(yield* maybeCurrentUser)) {
            return bounceToLogin("/account");
        }

        const codeVerifier = randomSecret();
        const state = randomSecret();

        // Build the provider's OAuth authorization request
        const authorizationRequest = Oidc.authorizationRequest({
            authorizationEndpoint: provider.authUrl,
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            scopes: provider.scopes,
            state: state,
            codeChallenge: yield* sha256(codeVerifier),
        });

        // Transform the authorization request into a URL with query parameters
        const authorizationUrl = yield* Url.make(
            authorizationRequest.url,
            authorizationRequest.urlParams,
            authorizationRequest.hash.valueOrUndefined
        ).pipe(Effect.fromResult);

        // Remember why we are sending them
        const intent = yield* Schema.encodeEffect(OAuthIntent)({
            returnTo: Option.getOrUndefined(returnTo),
            mode,
        });

        // The callback verifies the state and code verifier and reads the
        // intent to know what to do with the account it gets back
        const cookieOptions = {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: cookies.secure,
            sameSite: "lax",
        } as const;

        // Redirect to the provider's OAuth 2.0 authorization endpoint
        return yield* HttpServerResponse.redirect(authorizationUrl).pipe(
            HttpServerResponse.setCookies([
                [cookies.name(provider.stateCookieName), state, cookieOptions],
                [cookies.name(provider.codeVerifierCookieName), codeVerifier, cookieOptions],
                [cookies.name(provider.intentCookieName), intent, cookieOptions],
            ])
        );
    });

const callback = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* provider.config;
        const cookies = yield* CookiePolicy;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const currentUser = yield* maybeCurrentUser;

        // Sign in could not be completed; nothing here is the visitor's
        // fault, so they land back on login rather than on an error page
        const failed = expireSpentCookies(provider, HttpServerResponse.redirect("/login?error=oauth"));

        // The provider redirects back with either an error or a code; a
        // visitor who wanders here by hand brings neither
        const urlParams = yield* HttpServerRequest.schemaSearchParams(
            Schema.Union([
                Schema.Struct({
                    error: Schema.String,
                }),
                Schema.Struct({
                    code: Schema.String,
                    state: Schema.String,
                }),
            ])
        ).pipe(Effect.option);
        if (Option.isNone(urlParams)) return yield* failed;

        // The visitor cancelled at the provider, or the provider refused
        if ("error" in urlParams.value) {
            yield* Effect.logInfo(`${provider.name} oauth callback returned an error`, urlParams.value.error);
            return yield* failed;
        }

        // The cookies set on the way out. Missing ones mean the ten minute
        // window closed or the flow never started in this browser; a state
        // that does not match the one that left is a forged or replayed
        // callback. Either way the visitor starts over.
        const stateCookie = yield* readCookie(provider.stateCookieName);
        const codeVerifierCookie = yield* readCookie(provider.codeVerifierCookieName);
        const intentCookie = yield* readCookie(provider.intentCookieName).pipe(
            Effect.flatMap(
                Option.match({
                    onNone: () => Effect.succeedNone,
                    onSome: (raw) => Schema.decodeEffect(OAuthIntent)(raw).pipe(Effect.option),
                })
            )
        );
        if (Option.isNone(stateCookie) || Option.isNone(codeVerifierCookie) || Option.isNone(intentCookie)) {
            return yield* failed;
        }
        if (stateCookie.value !== urlParams.value.state) return yield* failed;

        // Exchange the authorization code for tokens
        const tokens = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: provider.tokenUrl,
            clientId: config.clientId,
            clientSecret: Redacted.value(config.clientSecret),
            redirectUri: config.redirectUri,
            code: urlParams.value.code,
            codeVerifier: codeVerifierCookie.value,
        }).pipe(
            Effect.tapError((error) => Effect.logWarning(`${provider.name} code exchange failed`, error)),
            Effect.option
        );
        if (Option.isNone(tokens)) return yield* failed;

        // Verify the ID token and extract user information
        const claims = yield* Oidc.fetchJwks(config.jwksUri).pipe(
            Effect.flatMap((jwks) =>
                Oidc.verifyIdToken({
                    jwks,
                    clientId: config.clientId,
                    issuer: provider.issuer,
                    idToken: tokens.value.id_token ?? "",
                })
            ),
            Effect.tapError((error) => Effect.logWarning(`${provider.name} id token verification failed`, error)),
            Effect.option
        );
        if (Option.isNone(claims)) return yield* failed;

        // What will get inserted into the database
        const profile = {
            provider: provider.name,
            providerAccountId: claims.value.sub,
            displayName: Option.getOrElse(Option.fromNullishOr(claims.value.name), () => "Tinyburg player"),
            avatarUrl: Option.none<string>(),
            email: Option.none<string>(),
        };

        if (intentCookie.value.mode === "link" && Option.isSome(currentUser)) {
            const outcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({ ...profile, userId: currentUser.value.user.id })
            );

            return yield* expireSpentCookies(provider, HttpServerResponse.redirect(`/account?link=${outcome}`));
        } else if (intentCookie.value.mode === "link" && Option.isNone(currentUser)) {
            return yield* expireSpentCookies(provider, bounceToLogin("/account"));
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const user = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile));
        const session = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                user,
                tokenHash,
                userAgent: Option.fromNullishOr(request.headers["user-agent"]).pipe(
                    Option.map((value) => value.slice(0, 512))
                ),
                ip: Option.none(),
            })
        );

        // `returnTo` was checked for an open redirect on the way out, and has
        // been in a cookie of ours ever since
        const response = yield* HttpServerResponse.setCookie(
            HttpServerResponse.redirect(intentCookie.value.returnTo ?? "/towers/@me"),
            cookies.name(PROVIDER_SESSION_COOKIE_NAME),
            sessionToken,
            {
                expires: DateTime.toDateUtc(session.expiresAt),
                httpOnly: true,
                path: "/",
                secure: cookies.secure,
                sameSite: "lax",
            }
        );

        return yield* expireSpentCookies(provider, response);
    });

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", start(google, "login")),
    HttpRouter.add("GET", "/auth/google/link", start(google, "link")),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", start(discord, "login")),
    HttpRouter.add("GET", "/auth/discord/link", start(discord, "link")),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

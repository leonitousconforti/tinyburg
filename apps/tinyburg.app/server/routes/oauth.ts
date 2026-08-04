import { Config, DateTime, Effect, Layer, Option, Redacted, Result, Schema, String } from "effect";
import { Cookies, Headers, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { randomSecret, sha256 } from "../crypto.ts";

interface OAuthProvider {
    readonly name: "google" | "discord";
    readonly authUrl: string;
    readonly tokenUrl: string;
    readonly issuer: string;
    readonly scopes: ReadonlyArray<string>;
    readonly stateCookieName: string;
    readonly codeVerifierCookieName: string;
    readonly config: Config.Config<{
        readonly clientId: string;
        readonly clientSecret: Redacted.Redacted;
        readonly redirectUri: string;
        readonly jwksUri: string;
    }>;
}

const google: OAuthProvider = {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    issuer: "https://accounts.google.com",
    scopes: ["openid", "email", "profile"],
    stateCookieName: "google_oauth_state_tinyburg",
    codeVerifierCookieName: "google_oauth_code_verifier_tinyburg",
    config: Config.all({
        clientId: Config.string("GOOGLE_CLIENT_ID"),
        clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
        redirectUri: Config.string("GOOGLE_REDIRECT_URI"),
        jwksUri: Config.string("GOOGLE_JWKS_URI"),
    }),
};

const discord: OAuthProvider = {
    name: "discord",
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    issuer: "https://discord.com",
    scopes: ["identify", "email", "openid"],
    stateCookieName: "discord_oauth_state_tinyburg",
    codeVerifierCookieName: "discord_oauth_code_verifier_tinyburg",
    config: Config.all({
        clientId: Config.string("DISCORD_CLIENT_ID"),
        clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
        redirectUri: Config.string("DISCORD_REDIRECT_URI"),
        jwksUri: Config.string("DISCORD_JWKS_URI"),
    }),
};

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

const start = (provider: OAuthProvider, _mode: "link" | "login") =>
    Effect.gen(function* () {
        const config = yield* Effect.orDie(provider.config);
        const secure = yield* Effect.orDie(SecureCookies);

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
        const authorizationUrl = Url.make(
            authorizationRequest.url,
            authorizationRequest.urlParams,
            authorizationRequest.hash.valueOrUndefined
        ).pipe(Result.getOrThrow);

        // Store the state in a cookie to verify later
        const maybeStateCookie = Cookies.makeCookieUnsafe(provider.stateCookieName, state, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax",
        });

        // Store the code verifier in a cookie to verify later
        const maybeCodeVerifierCookie = Cookies.makeCookieUnsafe(provider.codeVerifierCookieName, codeVerifier, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax",
        });

        // Redirect to the provider's OAuth 2.0 authorization endpoint
        return HttpServerResponse.redirect(authorizationUrl, {
            cookies: Cookies.fromIterable([maybeStateCookie, maybeCodeVerifierCookie]),
        });
    });

const callback = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* Effect.orDie(provider.config);
        const secure = yield* Effect.orDie(SecureCookies);
        const request = yield* HttpServerRequest.HttpServerRequest;

        // Parse query parameters
        const urlParams = yield* Schema.decodeUnknownEffect(
            Schema.Union([
                Schema.Struct({
                    error: Schema.String,
                }),
                Schema.Struct({
                    code: Schema.String,
                    state: Schema.String,
                }),
            ])
        )(HttpServerRequest.searchParamsFromURL(new URL(request.originalUrl, "http://0.0.0.0")));

        // Handle error from OAuth provider
        if ("error" in urlParams) {
            return yield* Effect.die(`${provider.name} OAuth error: ${urlParams.error}`);
        }

        // Retrieve cookies
        const codeVerifierCookie = Option.fromNullishOr(request.cookies[provider.codeVerifierCookieName]);
        const stateCookie = Option.fromNullishOr(request.cookies[provider.stateCookieName]);

        // Check state parameter to prevent CSRF attacks
        if (Option.isNone(stateCookie) || Option.isNone(codeVerifierCookie) || stateCookie.value !== urlParams.state) {
            return yield* Effect.die(`Invalid state parameter in ${provider.name} OAuth callback`);
        }

        // Exchange the authorization code for tokens
        const tokens = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: provider.tokenUrl,
            clientId: config.clientId,
            clientSecret: Redacted.value(config.clientSecret),
            redirectUri: config.redirectUri,
            code: urlParams.code,
            codeVerifier: codeVerifierCookie.value,
        });

        // The state cookie has served its purpose, delete it
        const deleteStateCookie = Cookies.makeCookieUnsafe(provider.stateCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax",
        });

        // The code verifier cookie has served its purpose, delete it
        const deleteCodeVerifierCookie = Cookies.makeCookieUnsafe(provider.codeVerifierCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax",
        });

        // Verify the ID token and extract user information
        const idToken = tokens.id_token ?? "";
        const claims = yield* Oidc.verifyIdToken({
            jwks: yield* Oidc.fetchJwks(config.jwksUri).pipe(Effect.orDie),
            clientId: config.clientId,
            issuer: provider.issuer,
            idToken,
        });

        // What will get inserted into the database
        const profile = {
            provider: provider.name,
            providerAccountId: claims.sub,
            displayName: yield* Option.fromNullishOr(claims.name).pipe(Effect.fromOption),
            avatarUrl: Option.none<string>(),
            email: Option.none<string>(),
        };

        // How the session is described
        const userAgent = Headers.get(request.headers, "user-agent").pipe(
            Option.map((agent) => agent.slice(0, 512)),
            Option.filter((agent) => agent.length > 0)
        );

        // Get the IP address of the request
        const ipAddress = Headers.get(request.headers, "do-connecting-ip").pipe(
            Option.orElse(() => Headers.get(request.headers, "x-real-ip")),
            Option.orElse(() => Headers.get(request.headers, "x-forwarded-for")),
            Option.orElse(() => request.remoteAddress)
        );

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const user = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile));
        const session = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                user,
                tokenHash,
                userAgent,
                ip: ipAddress,
            })
        );

        const sessionCookie = Cookies.makeCookieUnsafe(SessionsRepository.PROVIDER_SESSION_COOKIE_NAME, sessionToken, {
            expires: DateTime.toDateUtc(session.expiresAt),
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax",
        });

        return HttpServerResponse.redirect("/towers/@me", {
            cookies: Cookies.fromIterable([sessionCookie, deleteStateCookie, deleteCodeVerifierCookie]),
        });
    });

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", start(google, "login")),
    HttpRouter.add("GET", "/auth/google/link", start(google, "link")),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", start(discord, "login")),
    HttpRouter.add("GET", "/auth/discord/link", start(discord, "link")),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

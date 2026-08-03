import { Config, Encoding, Effect, Layer, Option, pipe, type Redacted, Result, Schema, String } from "effect";
import {
    Cookies,
    HttpBody,
    HttpClient,
    HttpClientRequest,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
    Url,
    UrlParams,
} from "effect/unstable/http";

import { UsersRepository } from "../../domain/users.ts";

interface OAuthProvider {
    readonly name: "google" | "discord";
    readonly authUrl: string;
    readonly tokenUrl: string;
    readonly scope: string;
    readonly stateCookieName: string;
    readonly codeVerifierCookieName: string;
    readonly config: Config.Config<{
        readonly clientId: string;
        readonly clientSecret: Redacted.Redacted;
        readonly redirectUri: string;
    }>;
}

const google: OAuthProvider = {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    stateCookieName: "google_oauth_state",
    codeVerifierCookieName: "google_oauth_code_verifier",
    config: Config.all({
        clientId: Config.string("GOOGLE_CLIENT_ID"),
        clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
        redirectUri: Config.string("GOOGLE_REDIRECT_URI"),
    }),
};

const discord: OAuthProvider = {
    name: "discord",
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email openid",
    stateCookieName: "discord_oauth_state",
    codeVerifierCookieName: "discord_oauth_code_verifier",
    config: Config.all({
        clientId: Config.string("DISCORD_CLIENT_ID"),
        clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
        redirectUri: Config.string("DISCORD_REDIRECT_URI"),
    }),
};

const randomStateGenerator = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) => byte.toString(16).padStart(2, "0")).join("");

const Sha256CodeChallenge = (verifier: string) =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
        (hashBuffer: ArrayBuffer) => Encoding.encodeBase64Url(new Uint8Array(hashBuffer))
    );

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

const login = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* Effect.orDie(provider.config);
        const secure = yield* Effect.orDie(SecureCookies);

        const state = randomStateGenerator();
        const codeVerifier = randomStateGenerator();

        // Build the provider's OAuth authorization URL
        const maybeAuthorizationUrl = pipe(
            UrlParams.empty,
            UrlParams.set("client_id", config.clientId),
            UrlParams.set("redirect_uri", config.redirectUri),
            UrlParams.set("response_type", "code"),
            UrlParams.set("scope", provider.scope),
            UrlParams.set("state", state),
            UrlParams.set("code_challenge_method", "S256"),
            UrlParams.set("code_challenge", yield* Sha256CodeChallenge(codeVerifier)),
            UrlParams.set("prompt", "consent"),
            (urlParams) => Url.make(provider.authUrl, urlParams, undefined),
            Result.getOrThrow
        );

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
        return HttpServerResponse.redirect(maybeAuthorizationUrl, {
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
        const stateCookie = Option.fromNullishOr(request.cookies[provider.stateCookieName]);
        const codeVerifierCookie = Option.fromNullishOr(request.cookies[provider.codeVerifierCookieName]);

        // Check state parameter to prevent CSRF attacks
        if (Option.isNone(stateCookie) || Option.isNone(codeVerifierCookie) || stateCookie.value !== urlParams.state) {
            return yield* Effect.die(`Invalid state parameter in ${provider.name} OAuth callback`);
        }

        // Exchange the authorization code for tokens
        const tokens = yield* HttpClientRequest.post(provider.tokenUrl, {
            headers: { "User-Agent": "TinyburgApp/1.0" },
            body: pipe(
                UrlParams.empty,
                UrlParams.set("grant_type", "authorization_code"),
                UrlParams.set("code", urlParams.code),
                UrlParams.set("redirect_uri", config.redirectUri),
                UrlParams.set("client_id", config.clientId),
                UrlParams.set("code_verifier", codeVerifierCookie.value),
                HttpBody.urlParams
            ),
        }).pipe(
            HttpClientRequest.acceptJson,
            HttpClientRequest.basicAuth(config.clientId, config.clientSecret),
            HttpClient.execute,
            Effect.flatMap((response) => response.json),
            Effect.flatMap(Schema.decodeUnknownEffect(OAuthResponseSchema))
        );

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

        // Upsert the user
        const claims = tokens.id_token;
        const providerAccountId = claims.sub;
        const avatarUrl = Option.fromNullishOr(claims.picture as string | undefined);
        const displayName = yield* Option.fromNullishOr(claims.name as string | undefined).pipe(Effect.fromOption);
        const user = yield* UsersRepository.use((repo) =>
            repo.upsertUserFromOAuth({
                provider: provider.name,
                displayName,
                providerAccountId,
                avatarUrl,
            })
        );

        return HttpServerResponse.redirect("/towers/@me", {
            cookies: Cookies.fromIterable([deleteStateCookie, deleteCodeVerifierCookie]),
        });
    });

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", login(google)),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", login(discord)),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

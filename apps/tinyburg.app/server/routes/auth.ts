import { Config, Encoding, Effect, Layer, Option, Redacted, Result, Schema, String } from "effect";
import { Cookies, HttpRouter, HttpServerRequest, HttpServerResponse, Url, UrlParams } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { UsersRepository } from "../../domain/users.ts";
import { issueProviderSession } from "../providerSession.ts";

/**
 * Where to land after a federated login. Only local absolute paths are
 * honoured, so a tampered `returnTo` can never bounce the browser off-site.
 * `/oauth/authorize` uses this to resume an authorization it interrupted.
 */
const DEFAULT_DESTINATION = "/towers/@me";

const sanitizeReturnTo = (returnTo: string | null): string =>
    returnTo !== null && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
        ? returnTo
        : DEFAULT_DESTINATION;

/**
 * The post-login destination rides inside the OAuth state parameter, which
 * already round-trips through the provider and is integrity-checked against
 * the state cookie. Base64url contains no ".", keeping the separator
 * unambiguous after the random prefix.
 */
const stateWithReturnTo = (state: string, returnTo: string | null): string =>
    returnTo === null ? state : `${state}.${Encoding.encodeBase64Url(sanitizeReturnTo(returnTo))}`;

const destinationFromState = (state: string): string => {
    const separator = state.indexOf(".");
    if (separator === -1) return DEFAULT_DESTINATION;
    const decoded = Encoding.decodeBase64UrlString(state.slice(separator + 1));
    return Result.isSuccess(decoded) ? sanitizeReturnTo(decoded.success) : DEFAULT_DESTINATION;
};

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
        readonly jwksUri: string;
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
        jwksUri: Config.string("GOOGLE_JWKS_URI"),
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
        jwksUri: Config.string("DISCORD_JWKS_URI"),
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
        const request = yield* HttpServerRequest.HttpServerRequest;

        // The state carries the post-login destination through the provider
        // round trip, so an interrupted /oauth/authorize can resume.
        const returnTo = new URL(request.originalUrl, "http://0.0.0.0").searchParams.get("returnTo");
        const state = stateWithReturnTo(randomStateGenerator(), returnTo);
        const codeVerifier = randomStateGenerator();

        // Build the provider's OAuth authorization URL
        const maybeAuthorizationUrl = UrlParams.empty.pipe(
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
        const claims = yield* Oidc.verifyIdToken({
            idToken: tokens.id_token ?? "",
            clientId: config.clientId,
            issuer: provider.name === "google" ? "https://accounts.google.com" : "https://discord.com",
            jwks:
                provider.name === "google"
                    ? yield* Oidc.fetchJwks("https://www.googleapis.com/oauth2/v3/certs").pipe(Effect.orDie)
                    : yield* Oidc.fetchJwks("https://discord.com/api/oauth2/keys").pipe(Effect.orDie),
        });

        // Upsert the user
        const providerAccountId = claims.sub;
        const avatarUrl = Option.fromNullishOr(claims.picture);
        const displayName = yield* Option.fromNullishOr(claims.name).pipe(Effect.fromOption);
        const user = yield* UsersRepository.use((repo) =>
            repo.upsertUserFromOAuth({
                provider: provider.name,
                displayName,
                providerAccountId,
                avatarUrl,
            })
        );

        // This browser is now signed in to the provider. The SPA gets no
        // credential here; it runs the code flow against /oauth/authorize,
        // which this session authenticates.
        const sessionCookie = yield* issueProviderSession(user);

        return HttpServerResponse.redirect(destinationFromState(urlParams.state), {
            cookies: Cookies.fromIterable([sessionCookie, deleteStateCookie, deleteCodeVerifierCookie]),
        });
    });

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", login(google)),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", login(discord)),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

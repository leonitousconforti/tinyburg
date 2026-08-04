import { Config, Encoding, Effect, Layer, Option, Redacted, Result, Schema, String } from "effect";
import { Cookies, HttpRouter, HttpServerRequest, HttpServerResponse, Url, UrlParams } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { UsersRepository } from "../../domain/users.ts";
import { randomSecret, sha256 } from "../crypto.ts";

/**
 * Where to land after a federated login. Only local absolute paths are
 * honoured, so a tampered `returnTo` can never bounce the browser off-site.
 * `/oauth/authorize` uses this to resume an authorization it interrupted.
 */
const DEFAULT_DESTINATION = "/towers/@me";

/** Where the connected accounts live, for a link round trip to return to. */
const ACCOUNTS_DESTINATION = "/towers/@me";

const sanitizeReturnTo = (returnTo: string | null): string =>
    returnTo !== null && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
        ? returnTo
        : DEFAULT_DESTINATION;

/**
 * Arriving at a provider's callback means one of two things, and the two must
 * never be confused: `login` says whoever comes back is who this browser now
 * is, `link` says the account this browser is already signed in to gains
 * another way in.
 */
type CallbackMode = "login" | "link";

/**
 * Both the mode and the post-login destination ride inside the OAuth state
 * parameter, which round-trips through the provider and is checked byte for
 * byte against the state cookie on the way back. Base64url contains no ".",
 * keeping the separators unambiguous after the random prefix.
 */
const encodeState = (mode: CallbackMode, returnTo: string | null): string =>
    `${randomSecret()}.${mode}.${Encoding.encodeBase64Url(sanitizeReturnTo(returnTo))}`;

const modeFromState = (state: string): CallbackMode => (state.split(".")[1] === "link" ? "link" : "login");

const destinationFromState = (state: string): string => {
    const encoded = state.split(".")[2];
    if (encoded === undefined) return DEFAULT_DESTINATION;
    const decoded = Encoding.decodeBase64UrlString(encoded);
    return Result.isSuccess(decoded) ? sanitizeReturnTo(decoded.success) : DEFAULT_DESTINATION;
};

/**
 * Reports the outcome of a link on the page the visitor lands back on. The
 * destination is a local path that may already carry a query of its own, so
 * the parameters are appended rather than assumed to be the first.
 */
const withLinkOutcome = (destination: string, provider: OAuthProviderName, outcome: string): string => {
    const url = new URL(destination, "http://0.0.0.0");
    url.searchParams.set("linked", provider);
    url.searchParams.set("result", outcome);
    return `${url.pathname}${url.search}`;
};

interface OAuthProvider {
    readonly name: "google" | "discord";
    readonly authUrl: string;
    readonly tokenUrl: string;
    readonly issuer: string;
    readonly jwksUrl: string;
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
    issuer: "https://accounts.google.com",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
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
    issuer: "https://discord.com",
    jwksUrl: "https://discord.com/api/oauth2/keys",
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

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

const start = (provider: OAuthProvider, mode: CallbackMode) =>
    Effect.gen(function* () {
        // Linking is something you do from inside an account. Without a session
        // there is nothing to link to, so this is a login like any other. The
        // question is settled before the provider's configuration is read, so
        // the answer does not depend on a provider we are not going to visit.
        if (mode === "link" && Option.isNone(yield* Effect.serviceOption(CurrentUser))) {
            return HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(ACCOUNTS_DESTINATION)}`);
        }

        const config = yield* Effect.orDie(provider.config);
        const secure = yield* Effect.orDie(SecureCookies);
        const request = yield* HttpServerRequest.HttpServerRequest;

        // The state carries the mode and the post-login destination through the
        // provider round trip, so an interrupted /oauth/authorize can resume.
        const returnTo = new URL(request.originalUrl, "http://0.0.0.0").searchParams.get("returnTo");
        const state = encodeState(mode, mode === "link" ? (returnTo ?? ACCOUNTS_DESTINATION) : returnTo);
        const codeVerifier = randomSecret();

        // Build the provider's OAuth authorization URL
        const maybeAuthorizationUrl = UrlParams.empty.pipe(
            UrlParams.set("client_id", config.clientId),
            UrlParams.set("redirect_uri", config.redirectUri),
            UrlParams.set("response_type", "code"),
            UrlParams.set("scope", provider.scope),
            UrlParams.set("state", state),
            UrlParams.set("code_challenge_method", "S256"),
            UrlParams.set("code_challenge", yield* sha256(codeVerifier)),
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

        const spentCookies = [deleteStateCookie, deleteCodeVerifierCookie];

        // Verify the ID token and extract user information
        const idToken = tokens.id_token ?? "";
        const claims = yield* Oidc.verifyIdToken({
            idToken,
            clientId: config.clientId,
            issuer: provider.issuer,
            jwks: yield* Oidc.fetchJwks(provider.jwksUrl).pipe(Effect.orDie),
        });

        const profile = {
            provider: provider.name,
            providerAccountId: claims.sub,
            displayName: yield* Option.fromNullishOr(claims.name).pipe(Effect.fromOption),
            // Both providers send an email for the scopes we ask for, but
            // `verifyIdToken` hands back only the claims it is opinionated
            // about. This reads one more out of the token it just verified,
            // so the connected accounts screen can say which account is which.
            email: claim(idToken, "email"),
            avatarUrl: Option.fromNullishOr(claims.picture),
        };
        const destination = destinationFromState(urlParams.state);

        // A link round trip adds a provider to the account this browser is
        // already signed in as, and issues no session of its own: the visitor
        // stays exactly who they were before they left.
        if (modeFromState(urlParams.state) === "link") {
            const maybeUser = yield* Effect.serviceOption(CurrentUser);
            if (Option.isNone(maybeUser)) {
                return HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(ACCOUNTS_DESTINATION)}`, {
                    cookies: Cookies.fromIterable(spentCookies),
                });
            }

            const outcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({ ...profile, userId: maybeUser.value.user.id })
            );

            return HttpServerResponse.redirect(withLinkOutcome(destination, provider.name, outcome), {
                cookies: Cookies.fromIterable(spentCookies),
            });
        }

        const user = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile));

        // This browser is now signed in to the provider. The SPA gets no
        // credential here; it runs the code flow against /oauth/authorize,
        // which this session authenticates.
        const sessionCookie = yield* issueProviderSession(user);

        return HttpServerResponse.redirect(destination, {
            cookies: Cookies.fromIterable([sessionCookie, ...spentCookies]),
        });
    });

/**
 * Federated login: Tinyburg is itself an OAuth client of these providers. The
 * session and account management endpoints that a login unlocks live in
 * `auth.ts`.
 */
export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", start(google, "login")),
    HttpRouter.add("GET", "/auth/google/link", start(google, "link")),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", start(discord, "login")),
    HttpRouter.add("GET", "/auth/discord/link", start(discord, "link")),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

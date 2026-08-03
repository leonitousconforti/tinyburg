import {
    Config,
    DateTime,
    Effect,
    Layer,
    Option,
    pipe,
    type Redacted,
    Result,
    Schema,
    SchemaGetter,
    String,
} from "effect";
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

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { destinationFromState, stateWithReturnTo } from "../../shared/returnTo.ts";
import { randomStateGenerator, Sha256CodeChallenge } from "../crypto.ts";
import { SecureCookies, SESSION_ID_COOKIE_NAME } from "../session.ts";

const JoseHeaderSchema = Schema.Struct({
    kid: Schema.String,
    typ: Schema.Literal("JWT"),
    alg: Schema.Literals([
        "HS256",
        "HS384",
        "HS512",
        "RS256",
        "RS384",
        "RS512",
        "ES256",
        "ES384",
        "ES512",
        "PS256",
        "PS384",
        "PS512",
        "none",
    ]),
});

const JwtBodySchema = Schema.StructWithRest(
    Schema.Struct({
        iss: Schema.String.pipe(Schema.annotate({ description: "Issuer" })),
        sub: Schema.String.pipe(Schema.annotate({ description: "Subject" })),
        aud: Schema.Union([Schema.String, Schema.Array(Schema.String)]).pipe(
            Schema.annotate({ description: "Audience" })
        ),
        exp: Schema.Number.pipe(Schema.annotate({ description: "Expiration Time" })),
        nbf: Schema.Number.pipe(Schema.annotate({ description: "Not Before" }), Schema.optional),
        iat: Schema.Number.pipe(Schema.annotate({ description: "Issued At" })),
        jti: Schema.String.pipe(Schema.annotate({ description: "JWT ID" }), Schema.optional),
    }),
    [Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Unknown))]
);

const JwtSchema = Schema.TemplateLiteralParser([
    Schema.StringFromBase64Url.pipe(Schema.decodeTo(Schema.fromJsonString(JoseHeaderSchema))),
    ".",
    Schema.StringFromBase64Url.pipe(Schema.decodeTo(Schema.fromJsonString(JwtBodySchema))),
    ".",
    Schema.String,
]).pipe(
    Schema.decodeTo(JwtBodySchema, {
        encode: SchemaGetter.forbidden(() => "Encoding JWTs is not supported"),
        decode: SchemaGetter.transform(([_header, _period, body, __period, _signature]) => body),
    })
);

const OAuthResponseSchema = Schema.Struct({
    access_token: Schema.String,
    expires_in: Schema.Int,
    refresh_token: Schema.optional(Schema.String),
    scope: Schema.String,
    token_type: Schema.String,
    id_token: JwtSchema,
});

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

const login = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* Effect.orDie(provider.config);
        const secure = yield* Effect.orDie(SecureCookies);
        const request = yield* HttpServerRequest.HttpServerRequest;

        // Generate state and code verifier for PKCE. The state also carries the
        // post-login destination through the provider round trip.
        const returnTo = new URL(request.originalUrl, "http://localhost").searchParams.get("returnTo");
        const state = stateWithReturnTo(randomStateGenerator(), returnTo);
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
            sameSite: "lax", // optional - do not use "strict"
        });

        // Store the code verifier in a cookie to verify later
        const maybeCodeVerifierCookie = Cookies.makeCookieUnsafe(provider.codeVerifierCookieName, codeVerifier, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax", // optional - do not use "strict"
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
        )(HttpServerRequest.searchParamsFromURL(new URL(request.originalUrl, "http://localhost")));

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
            sameSite: "lax", // optional - do not use "strict"
        });

        // The code verifier cookie has served its purpose, delete it
        const deleteCodeVerifierCookie = Cookies.makeCookieUnsafe(provider.codeVerifierCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax", // optional - do not use "strict"
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

        // Create a session for the user
        const session = yield* SessionsRepository.use((repo) => repo.createSession(user));
        const sessionCookie = Cookies.makeCookieUnsafe(SESSION_ID_COOKIE_NAME, session.id, {
            expires: DateTime.toDateUtc(session.expiresAt),
            httpOnly: true,
            path: "/",
            secure,
            sameSite: "lax", // optional - do not use "strict"
        });

        // Resume the destination that started the login, defaulting to the
        // user's towers page
        return HttpServerResponse.redirect(destinationFromState(urlParams.state), {
            cookies: Cookies.fromIterable([sessionCookie, deleteStateCookie, deleteCodeVerifierCookie]),
        });
    });

const logout = Effect.gen(function* () {
    const secure = yield* Effect.orDie(SecureCookies);
    const request = yield* HttpServerRequest.HttpServerRequest;

    // Early short circuit if no user is logged in
    const sessionId = request.cookies[SESSION_ID_COOKIE_NAME];
    if (sessionId === undefined) return HttpServerResponse.redirect("/");

    // Delete the old session cookie
    const deleteSessionCookie = Cookies.makeCookieUnsafe(SESSION_ID_COOKIE_NAME, String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure,
        sameSite: "lax", // optional - do not use "strict"
    });

    // Delete the session from the database, treating errors as already signed out
    yield* SessionsRepository.use((repo) => repo.deleteSession(sessionId)).pipe(Effect.catch(() => Effect.void));
    return HttpServerResponse.redirect("/", {
        cookies: Cookies.fromIterable([deleteSessionCookie]),
    });
});

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", login(google)),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", login(discord)),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord)),
    HttpRouter.add("GET", "/logout", logout)
);

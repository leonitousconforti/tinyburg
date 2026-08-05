import { Config, DateTime, Effect, Layer, Option, Redacted, Schema, String } from "effect";
import { Cookies, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

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

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

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
    Effect.map(Option.filter((value) => value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")))
);

/** Sends a visitor who needs to be signed in through login first. */
const bounceToLogin = (returnTo: string, cookies: ReadonlyArray<Cookies.Cookie> = []) =>
    HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`, {
        cookies: Cookies.fromIterable(cookies),
    });

const start = (
    provider: OAuthProvider,
    mode: "link" | "login"
): Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    Cookies.CookiesError | Url.UrlError | Schema.SchemaError | Config.ConfigError,
    HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams | SessionsRepository
> =>
    Effect.gen(function* () {
        const config = yield* provider.config;
        const secureCookies = yield* SecureCookies;

        const returnTo = mode === "link" ? Option.none<string>() : yield* returnToParam;
        if (mode === "link" && Option.isNone(yield* SessionsRepository.maybeCurrentUser)) {
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

        // Store the state in a cookie to verify later
        const stateCookie = yield* Cookies.makeCookie(provider.stateCookieName, state, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // Store the code verifier in a cookie to verify later
        const codeVerifierCookie = yield* Cookies.makeCookie(provider.codeVerifierCookieName, codeVerifier, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // Remember why we are sending them
        const intent = yield* Schema.encodeEffect(OAuthIntent)({
            returnTo: Option.getOrUndefined(returnTo),
            mode,
        });

        // So the callback knows what to do with the account it gets back
        const intentCookie = yield* Cookies.makeCookie(provider.intentCookieName, intent, {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // Redirect to the provider's OAuth 2.0 authorization endpoint
        return HttpServerResponse.redirect(authorizationUrl, {
            cookies: Cookies.fromIterable([stateCookie, codeVerifierCookie, intentCookie]),
        });
    });

const callback = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* provider.config;
        const secureCookies = yield* SecureCookies;
        const maybeCurrentUser = yield* SessionsRepository.maybeCurrentUser;

        // Parse the url params
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
        );

        // Handle error from OAuth provider
        if ("error" in urlParams) {
            return yield* Effect.die(`${provider.name} OAuth error: ${urlParams.error}`);
        }

        // Parse the cookies
        const { codeVerifierCookie, intentCookie } = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [provider.stateCookieName]: Schema.Literal(urlParams.state),
                [provider.codeVerifierCookieName]: Schema.String,
                [provider.intentCookieName]: OAuthIntent,
            })
        ).pipe(
            Effect.map(
                ({
                    [provider.stateCookieName]: stateCookie,
                    [provider.codeVerifierCookieName]: codeVerifierCookie,
                    [provider.intentCookieName]: intentCookie,
                }) => ({
                    stateCookie: stateCookie as string,
                    codeVerifierCookie: codeVerifierCookie as string,
                    intentCookie: intentCookie as typeof OAuthIntent.Type,
                })
            )
        );

        // Parse the headers
        const headers = yield* HttpServerRequest.schemaHeaders(
            Schema.Struct({
                "user-agent": Schema.String,
                "do-connecting-ip": Schema.optional(Schema.String),
                "x-real-ip": Schema.optional(Schema.String),
                "x-forwarded-for": Schema.optional(Schema.String),
            })
        );

        // Exchange the authorization code for tokens
        const tokens = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: provider.tokenUrl,
            clientId: config.clientId,
            clientSecret: Redacted.value(config.clientSecret),
            redirectUri: config.redirectUri,
            code: urlParams.code,
            codeVerifier: codeVerifierCookie,
        });

        // The state cookie has served its purpose, delete it
        const deleteStateCookie = yield* Cookies.makeCookie(provider.stateCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // The code verifier cookie has served its purpose, delete it
        const deleteCodeVerifierCookie = yield* Cookies.makeCookie(provider.codeVerifierCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // The intent cookie has served its purpose, delete it
        const deleteIntentCookie = yield* Cookies.makeCookie(provider.intentCookieName, String.empty, {
            expires: new Date(0),
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // Cookies that have served their purpose and should be deleted in the response
        const spentCookies = [deleteStateCookie, deleteCodeVerifierCookie, deleteIntentCookie];

        // Verify the ID token and extract user information
        const idToken = tokens.id_token ?? "";
        const claims = yield* Oidc.verifyIdToken({
            jwks: yield* Oidc.fetchJwks(config.jwksUri),
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

        if (intentCookie.mode === "link" && Option.isSome(maybeCurrentUser)) {
            const outcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({ ...profile, userId: maybeCurrentUser.value.user.id })
            );

            return HttpServerResponse.redirect(`/account?link=${outcome}`, {
                cookies: Cookies.fromIterable(spentCookies),
            });
        } else if (intentCookie.mode === "link" && Option.isNone(maybeCurrentUser)) {
            return bounceToLogin("/account", spentCookies);
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const user = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile));
        const session = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                user,
                tokenHash,
                userAgent: Option.some(headers["user-agent"].slice(0, 512)),
                ip: Option.none(),
            })
        );

        const sessionCookie = yield* Cookies.makeCookie(SessionsRepository.PROVIDER_SESSION_COOKIE_NAME, sessionToken, {
            expires: DateTime.toDateUtc(session.expiresAt),
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }).pipe(Effect.fromResult);

        // `returnTo` was checked for an open redirect on the way out, and has
        // been in a cookie of ours ever since
        return HttpServerResponse.redirect(intentCookie.returnTo ?? "/towers/@me", {
            cookies: Cookies.fromIterable([sessionCookie, ...spentCookies]),
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

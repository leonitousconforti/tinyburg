import type { SqlError } from "effect/unstable/sql";

import { Config, DateTime, Effect, Layer, Option, Redacted, Schema } from "effect";
import { type Cookies, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { CookiePolicy, maybeCurrentUser, PROVIDER_SESSION_COOKIE_NAME } from "../cookies.ts";
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

const expireSpentCookies = (provider: OAuthProvider) => (response: HttpServerResponse.HttpServerResponse) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;

        const expireOptions = {
            httpOnly: true,
            path: "/",
            secure: cookiesPolicy.secure,
            sameSite: "lax",
        } as const;

        const stateCookieName = cookiesPolicy.name(provider.stateCookieName);
        const codeVerifierCookieName = cookiesPolicy.name(provider.codeVerifierCookieName);
        const intentCookieName = cookiesPolicy.name(provider.intentCookieName);

        return yield* Effect.succeed(response).pipe(
            Effect.flatMap(HttpServerResponse.expireCookie(stateCookieName, expireOptions)),
            Effect.flatMap(HttpServerResponse.expireCookie(codeVerifierCookieName, expireOptions)),
            Effect.flatMap(HttpServerResponse.expireCookie(intentCookieName, expireOptions))
        );
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
        if (mode === "link" && Option.isNone(yield* maybeCurrentUser)) return bounceToLogin("/account");

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
    }).pipe(Effect.catch(() => Effect.succeed(HttpServerResponse.redirect("/login?error=oauth"))));

const callback = (provider: OAuthProvider) =>
    Effect.gen(function* () {
        const config = yield* provider.config;
        const cookiesPolicy = yield* CookiePolicy;
        const currentUser = yield* maybeCurrentUser;

        // What to do on failure
        const expireMySpentCookies = expireSpentCookies(provider);
        const failed = (to: string, errorMessage: string = "oauth") => {
            const encodedErrorMessage = encodeURIComponent(errorMessage);
            const toWithError = `${to}?error=${encodedErrorMessage}`;
            return expireMySpentCookies(HttpServerResponse.redirect(toWithError));
        };

        // The provider redirects back with either an error or a code
        const maybeUrlParams = yield* HttpServerRequest.schemaSearchParams(
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
        if (Option.isNone(maybeUrlParams)) {
            return yield* failed("/login", "invalid_oauth_callback");
        }

        // The visitor cancelled at the provider, or the provider refused
        const urlParams = maybeUrlParams.value;
        if ("error" in urlParams) {
            return yield* failed("/login", urlParams.error);
        }

        // Parse the cookies
        const maybeCookies = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(provider.stateCookieName)]: Schema.Literal(urlParams.state),
                [cookiesPolicy.name(provider.codeVerifierCookieName)]: Schema.String,
                [cookiesPolicy.name(provider.intentCookieName)]: OAuthIntent,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeCookies)) {
            return yield* failed("/login", "invalid_oauth_cookies");
        }

        // Extract the code verifier and intent from the cookies
        const cookies = maybeCookies.value;
        const codeVerifierCookie = cookies[cookiesPolicy.name(provider.codeVerifierCookieName)] as string;
        const intentCookie = cookies[cookiesPolicy.name(provider.intentCookieName)] as typeof OAuthIntent.Type;

        // Parse the headers
        const maybeHeaders = yield* HttpServerRequest.schemaHeaders(
            Schema.Struct({
                "user-agent": Schema.optional(Schema.String),
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeHeaders)) {
            return yield* failed("/login", "invalid_oauth_headers");
        }

        // Exchange the authorization code for tokens
        const maybeToken = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: provider.tokenUrl,
            clientId: config.clientId,
            clientSecret: Redacted.value(config.clientSecret),
            redirectUri: config.redirectUri,
            code: urlParams.code,
            codeVerifier: codeVerifierCookie,
        }).pipe(Effect.option);
        if (Option.isNone(maybeToken)) {
            return yield* failed("/login", "invalid_oauth_token");
        }

        // Verify the ID token and extract user information
        const maybeClaims = yield* Oidc.fetchJwks(config.jwksUri).pipe(
            Effect.flatMap((jwks) =>
                Oidc.verifyIdToken({
                    jwks,
                    clientId: config.clientId,
                    issuer: provider.issuer,
                    idToken: maybeToken.value.id_token ?? "",
                })
            ),
            Effect.option
        );
        if (Option.isNone(maybeClaims)) {
            return yield* failed("/login", "invalid_oauth_claims");
        }

        // What will get inserted into the database
        const claims = maybeClaims.value;
        const profile = {
            provider: provider.name,
            providerAccountId: claims.sub,
            displayName: Option.getOrElse(Option.fromNullishOr(claims.name), () => "Tinyburg player"),
            avatarUrl: Option.none<string>(),
            email: Option.none<string>(),
        };

        if (intentCookie.mode === "link" && Option.isSome(currentUser)) {
            const outcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({ ...profile, userId: currentUser.value.user.id })
            );

            return yield* HttpServerResponse.redirect(`/account?link=${outcome}`).pipe(expireMySpentCookies);
        } else if (intentCookie.mode === "link" && Option.isNone(currentUser)) {
            return yield* bounceToLogin("/account").pipe(expireMySpentCookies);
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const user = yield* UsersRepository.use((repo) => repo.signInWithOAuth(profile));

        const userAgent = Option.fromNullishOr(maybeHeaders.value["user-agent"]).pipe(
            Option.map((value) => value.slice(0, 512))
        );

        const session = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                user,
                tokenHash,
                userAgent,
                ip: Option.none(),
            })
        );

        // `returnTo` was checked for an open redirect on the way out, and has
        // been in a cookie of ours ever since
        return yield* HttpServerResponse.redirect(intentCookie.returnTo ?? "/towers/@me").pipe(
            HttpServerResponse.setCookie(cookiesPolicy.name(PROVIDER_SESSION_COOKIE_NAME), sessionToken, {
                expires: DateTime.toDateUtc(session.expiresAt),
                httpOnly: true,
                path: "/",
                secure: cookiesPolicy.secure,
                sameSite: "lax",
            }),
            Effect.flatMap(expireMySpentCookies)
        );
    });

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/google/login", start(google, "login")),
    HttpRouter.add("GET", "/auth/google/link", start(google, "link")),
    HttpRouter.add("GET", "/auth/google/callback", callback(google)),
    HttpRouter.add("GET", "/auth/discord/login", start(discord, "login")),
    HttpRouter.add("GET", "/auth/discord/link", start(discord, "link")),
    HttpRouter.add("GET", "/auth/discord/callback", callback(discord))
);

import type { SqlError } from "effect/unstable/sql";

import { Config, DateTime, Effect, Layer, Option, Redacted, Ref, Result, Schema } from "effect";
import {
    type Cookies,
    HttpClient,
    type HttpClientError,
    HttpClientRequest,
    HttpClientResponse,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
    Url,
} from "effect/unstable/http";

import { type Jwt, Oidc } from "effect-oidc";

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

interface OAuthProviderConfigRealized extends Omit<OAuthProvider, "config"> {
    readonly config: Config.Success<OAuthProvider["config"]>;
    readonly jwks: Effect.Effect<
        Schema.Schema.Type<typeof Jwt.JwksSchema>,
        Schema.SchemaError | HttpClientError.HttpClientError,
        never
    >;
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

const providerError = (error: string): string =>
    error === "access_denied" ? "oauth_denied" : "invalid_oauth_provider";

const expireSpentCookies =
    (provider: OAuthProviderConfigRealized) => (response: HttpServerResponse.HttpServerResponse) =>
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
    provider: OAuthProviderConfigRealized,
    mode: "link" | "login"
): Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    Cookies.CookiesError | Url.UrlError | Schema.SchemaError | Config.ConfigError | SqlError.SqlError,
    CookiePolicy | HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams | SessionsRepository
> =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;
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

        const codeVerifier = randomSecret();
        const state = randomSecret();

        // Build the provider's OAuth authorization request
        const authorizationRequest = Oidc.authorizationRequest({
            authorizationEndpoint: provider.authUrl,
            clientId: provider.config.clientId,
            redirectUri: provider.config.redirectUri,
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

        // Remember why we are sending them
        const intentSerialized = yield* Schema.encodeEffect(OAuthIntent)({
            returnTo: Option.getOrUndefined(returnTo),
            mode,
        }).pipe(Effect.orDie);

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
                [cookies.name(provider.intentCookieName), intentSerialized, cookieOptions],
            ]),
            Effect.catch(() => {
                if (mode === "link") {
                    return Effect.succeed(HttpServerResponse.redirect("/account?error=start_failed"));
                } else {
                    return Effect.succeed(HttpServerResponse.redirect("/login?error=start_failed"));
                }
            })
        );
    }).pipe(Effect.satisfiesErrorType<never>());

const callback = (provider: OAuthProviderConfigRealized) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;

        // What to do on failure
        const expireMySpentCookies = expireSpentCookies(provider);
        const failed = (to: string, errorMessage: string = "oauth") => {
            const encodedErrorMessage = encodeURIComponent(errorMessage);
            const toWithError = `${to}?error=${encodedErrorMessage}`;
            return HttpServerResponse.redirect(toWithError).pipe(expireMySpentCookies, Effect.orDie);
        };

        // We start by parsing the intent cookie so that we know where to
        // redirect on errors, either login or account.
        const maybeIntentCookie = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(provider.intentCookieName)]: OAuthIntent,
            })
        ).pipe(
            Effect.map((cookies) => cookies[cookiesPolicy.name(provider.intentCookieName)]),
            Effect.option
        );

        // Uh oh
        if (Option.isNone(maybeIntentCookie)) {
            return yield* failed("/login", "invalid_oauth_intent");
        }

        // Make a new failed based on the intent
        const failedRedirectByIntent = (errorMessage: string = "oauth") => {
            if (maybeIntentCookie.value.mode === "link") {
                return failed("/account", errorMessage);
            } else {
                return failed("/login", errorMessage);
            }
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
            return yield* failedRedirectByIntent("invalid_oauth_callback");
        }

        // The visitor cancelled at the provider, or the provider refused
        const urlParams = maybeUrlParams.value;
        if ("error" in urlParams) {
            return yield* failedRedirectByIntent(providerError(urlParams.error));
        }

        // Parse the cookies
        const maybeCookies = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(provider.stateCookieName)]: Schema.Literal(urlParams.state),
                [cookiesPolicy.name(provider.codeVerifierCookieName)]: Schema.String,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeCookies)) {
            return yield* failedRedirectByIntent("invalid_oauth_cookies");
        }

        // Extract the code verifier and intent from the cookies
        const cookies = maybeCookies.value;
        const intentCookie = maybeIntentCookie.value;
        const codeVerifierCookie = cookies[cookiesPolicy.name(provider.codeVerifierCookieName)];

        // Parse the headers
        const maybeHeaders = yield* HttpServerRequest.schemaHeaders(
            Schema.Struct({
                "user-agent": Schema.optional(Schema.String),
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeHeaders)) {
            return yield* failedRedirectByIntent("invalid_oauth_headers");
        }

        // Exchange the authorization code for tokens
        const maybeToken = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: provider.tokenUrl,
            clientId: provider.config.clientId,
            clientSecret: Redacted.value(provider.config.clientSecret),
            redirectUri: provider.config.redirectUri,
            code: urlParams.code,
            codeVerifier: codeVerifierCookie,
        }).pipe(Effect.option);
        if (Option.isNone(maybeToken)) {
            return yield* failedRedirectByIntent("invalid_oauth_token");
        }

        // Verify the ID token and extract user information
        const maybeClaims = yield* provider.jwks.pipe(
            Effect.flatMap((jwks) =>
                Oidc.verifyIdToken({
                    jwks,
                    clientId: provider.config.clientId,
                    issuer: provider.issuer,
                    idToken: maybeToken.value.id_token ?? "",
                })
            ),
            Effect.option
        );
        if (Option.isNone(maybeClaims)) {
            return yield* failedRedirectByIntent("invalid_oauth_claims");
        }

        // Providers that leave `name` out of the ID token get a second look
        // at their own user endpoint before we settle for the placeholder
        const claims = maybeClaims.value;
        const fetchedName = yield* provider.fetchDisplayName(maybeToken.value.access_token);

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
        if (intentCookie.mode === "link") {
            const tryCurrentUser = yield* maybeCurrentUser.pipe(Effect.option);
            if (Option.isNone(tryCurrentUser)) {
                return yield* failedRedirectByIntent("invalid_oauth_current_user");
            }

            const currentUser = tryCurrentUser.value;
            if (Option.isNone(currentUser)) {
                return yield* bounceToLogin("/account").pipe(expireMySpentCookies, Effect.orDie);
            }

            const maybeOutcome = yield* UsersRepository.use((repo) =>
                repo.linkOAuthAccount({
                    ...profile,
                    userId: currentUser.value.user.id,
                })
            ).pipe(Effect.option);
            if (Option.isNone(maybeOutcome)) {
                return yield* HttpServerResponse.redirect(`/account?error=invalid_oauth_link`).pipe(
                    expireMySpentCookies,
                    Effect.orDie
                );
            } else {
                return yield* HttpServerResponse.redirect(`/account?link=${maybeOutcome.value}`).pipe(
                    expireMySpentCookies,
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

        const returnTo = Option.fromNullishOr(intentCookie.returnTo).pipe(
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
            Effect.flatMap(expireMySpentCookies),
            Effect.catch(() => failedRedirectByIntent("invalid_oauth_response"))
        );
    }).pipe(Effect.satisfiesErrorType<never>());

export const OAuthRoutesLive = Effect.gen(function* () {
    const googleConfig = yield* google.config;
    const discordConfig = yield* discord.config;
    const httpClient = yield* HttpClient.HttpClient;

    const cachedJwks = (jwksUri: string) =>
        Effect.flatMap(Ref.make(Option.none<Schema.Schema.Type<typeof Jwt.JwksSchema>>()), (lastGood) =>
            Oidc.fetchJwks(jwksUri).pipe(
                Effect.provideService(HttpClient.HttpClient, httpClient),
                Effect.tap((jwks) => Ref.set(lastGood, Option.some(jwks))),
                Effect.catch((error) =>
                    Ref.get(lastGood).pipe(
                        Effect.flatMap(
                            Option.match({
                                onNone: () => Effect.fail(error),
                                onSome: Effect.succeed,
                            })
                        )
                    )
                ),
                Effect.cachedInvalidateWithTTL("10 minutes"),
                Effect.map(([cached, invalidate]) => Effect.tapError(cached, () => invalidate))
            )
        );

    const googleRealized: OAuthProviderConfigRealized = {
        ...google,
        config: googleConfig,
        jwks: yield* cachedJwks(googleConfig.jwksUri),
        // Google puts `name` in the ID token, so there is nothing to fetch
        fetchDisplayName: () => Effect.succeed(Option.none()),
    };

    const discordRealized: OAuthProviderConfigRealized = {
        ...discord,
        config: discordConfig,
        jwks: yield* cachedJwks(discordConfig.jwksUri),
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

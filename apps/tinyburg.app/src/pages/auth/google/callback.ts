import { DateTime, Effect, Option, pipe, Schema, String } from "effect";
import {
    Cookies,
    HttpBody,
    HttpClient,
    HttpClientRequest,
    HttpServerRequest,
    HttpServerResponse,
    UrlParams,
} from "effect/unstable/http";

import { makeAstroEndpoint } from "../../../../api/handler";
import { SessionsRepository } from "../../../../domain/sessions";
import { UsersRepository } from "../../../../domain/users";
import { destinationFromState, OAuthResponseSchema, SESSION_ID_COOKIE_NAME } from "../_shared";
import {
    GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME,
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
    GoogleOAuthConfig,
    tokenUrl,
} from "./_shared";

export const GET = Effect.gen(function* () {
    const config = yield* Effect.orDie(GoogleOAuthConfig);
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
    )(HttpServerRequest.searchParamsFromURL(new URL(request.originalUrl)));

    // Handle error from OAuth provider
    if ("error" in urlParams) {
        return yield* Effect.die(`Google OAuth error: ${urlParams.error}`);
    }

    // Retrieve cookies
    const stateCookie = Option.fromNullishOr(request.cookies[GOOGLE_OAUTH_STATE_COOKIE_NAME]);
    const codeVerifierCookie = Option.fromNullishOr(request.cookies[GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME]);

    // Check state parameter to prevent CSRF attacks
    if (Option.isNone(stateCookie) || Option.isNone(codeVerifierCookie) || stateCookie.value !== urlParams.state) {
        return yield* Effect.die("Invalid state parameter in Google OAuth callback");
    }

    // Exchange the authorization code for tokens
    const tokens = yield* HttpClientRequest.post(tokenUrl, {
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
    const deleteStateCookie = Cookies.makeCookieUnsafe(GOOGLE_OAUTH_STATE_COOKIE_NAME, String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // The code verifier cookie has served its purpose, delete it
    const deleteCodeVerifierCookie = Cookies.makeCookieUnsafe(GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME, String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Upsert the user
    const claims = tokens.id_token;
    const providerAccountId = claims.sub;
    const avatarUrl = Option.fromNullishOr(claims.picture as string | undefined);
    const displayName = yield* Option.fromNullishOr(claims.name as string | undefined).pipe(Effect.fromOption);
    const user = yield* UsersRepository.use((repo) =>
        repo.upsertUserFromOAuth({
            provider: "google",
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
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Resume the destination that started the login, defaulting to the
    // user's towers page
    return HttpServerResponse.redirect(destinationFromState(urlParams.state), {
        cookies: Cookies.fromIterable([sessionCookie, deleteStateCookie, deleteCodeVerifierCookie]),
    });
}).pipe(makeAstroEndpoint);

import { Effect, Result, pipe } from "effect";
import { Cookies, HttpServerResponse, Url, UrlParams } from "effect/unstable/http";

import { makeAstroEndpoint, render500 } from "../../../../api/handler";
import { randomStateGenerator, Sha256CodeChallenge } from "../_shared";
import {
    authUrl,
    GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME,
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
    GoogleOAuthConfig,
} from "./_shared";

export const GET = Effect.gen(function* () {
    const config = yield* Effect.orDie(GoogleOAuthConfig);

    // Generate state and code verifier for PKCE
    const state = randomStateGenerator();
    const codeVerifier = randomStateGenerator();

    // Build the Google OAuth authorization URL
    const maybeGoogleAuthorizationUrl = pipe(
        UrlParams.empty,
        UrlParams.set("client_id", config.clientId),
        UrlParams.set("redirect_uri", config.redirectUri),
        UrlParams.set("response_type", "code"),
        UrlParams.set("scope", "openid email profile"),
        UrlParams.set("state", state),
        UrlParams.set("code_challenge_method", "S256"),
        UrlParams.set("code_challenge", yield* Sha256CodeChallenge(codeVerifier)),
        UrlParams.set("prompt", "consent"),
        (urlParams) => Url.make(authUrl, urlParams, undefined),
        Result.getOrThrow
    );

    // Store the state in a cookie to verify later
    const maybeStateCookie = Cookies.makeCookieUnsafe(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Store the code verifier in a cookie to verify later
    const maybeCodeVerifierCookie = Cookies.makeCookieUnsafe(GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME, codeVerifier, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Redirect to Google's OAuth 2.0 authorization endpoint
    return HttpServerResponse.redirect(maybeGoogleAuthorizationUrl, {
        cookies: Cookies.fromIterable([maybeStateCookie, maybeCodeVerifierCookie]),
    });
}).pipe(render500, makeAstroEndpoint);

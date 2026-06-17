import { Effect, Result, pipe } from "effect";
import { Cookies, HttpServerResponse, UrlParams } from "effect/unstable/http";

import { makeAstroEndpoint, render500 } from "../../../../api/handler";
import { randomStateGenerator, Sha256CodeChallenge } from "../_shared";
import {
    authUrl,
    DISCORD_OAUTH_CODE_VERIFIER_COOKIE_NAME,
    DISCORD_OAUTH_STATE_COOKIE_NAME,
    DiscordOAuthConfig,
} from "./_shared";

export const GET = Effect.gen(function* () {
    const config = yield* Effect.orDie(DiscordOAuthConfig);

    // Generate state and code verifier for PKCE
    const state = randomStateGenerator();
    const codeVerifier = randomStateGenerator();

    // Build the Discord OAuth authorization URL
    const maybeDiscordAuthorizationUrl = pipe(
        UrlParams.empty,
        UrlParams.set("client_id", config.clientId),
        UrlParams.set("redirect_uri", config.redirectUri),
        UrlParams.set("response_type", "code"),
        UrlParams.set("scope", "identify email openid"),
        UrlParams.set("state", state),
        UrlParams.set("code_challenge_method", "S256"),
        UrlParams.set("code_challenge", yield* Sha256CodeChallenge(codeVerifier)),
        UrlParams.set("prompt", "consent"),
        (urlParams) => UrlParams.makeUrl(authUrl, urlParams, undefined),
        Result.getOrThrow
    );

    // Store the state in a cookie to verify later
    const maybeStateCookie = Cookies.makeCookieUnsafe(DISCORD_OAUTH_STATE_COOKIE_NAME, state, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Store the code verifier in a cookie to verify later
    const maybeCodeVerifierCookie = Cookies.makeCookieUnsafe(DISCORD_OAUTH_CODE_VERIFIER_COOKIE_NAME, codeVerifier, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Redirect to Discord's OAuth 2.0 authorization endpoint
    return HttpServerResponse.redirect(maybeDiscordAuthorizationUrl, {
        cookies: Cookies.fromIterable([maybeStateCookie, maybeCodeVerifierCookie]),
    });
}).pipe(render500, makeAstroEndpoint);

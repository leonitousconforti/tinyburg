import { Cookies, HttpServerResponse, UrlParams } from "@effect/platform";
import { Effect, Either, Option, pipe } from "effect";

import { makeAstroEndpoint } from "../../../../api/handler";
import { AstroContext } from "../../../../api/tags";
import { randomStateGenerator, Sha256CodeChallenge } from "../shared";
import { authUrl, GoogleOAuthConfig } from "./shared";

export const GET = Effect.gen(function* () {
    const Astro = yield* AstroContext;
    const state = randomStateGenerator();
    const codeVerifier = randomStateGenerator();
    const config = yield* Effect.orDie(GoogleOAuthConfig);

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
        (urlParams) => UrlParams.makeUrl(authUrl, urlParams, Option.none()),
        Either.getOrUndefined
    );

    // Store the state in a cookie to verify later
    const maybeStateCookie = Cookies.makeCookie("google_oauth_state", state, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    }).pipe(Either.getOrUndefined);

    // Store the code verifier in a cookie to verify later
    const maybeCodeVerifierCookie = Cookies.makeCookie("google_oauth_verifier", codeVerifier, {
        maxAge: "10 minutes",
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    }).pipe(Either.getOrUndefined);

    // Check that everything was created successfully
    if (
        maybeGoogleAuthorizationUrl === undefined ||
        maybeStateCookie === undefined ||
        maybeCodeVerifierCookie === undefined
    ) {
        return yield* Effect.map(
            Effect.promise(() => Astro.rewrite("/500")),
            HttpServerResponse.fromWeb
        );
    }

    // Redirect to Google's OAuth 2.0 authorization endpoint
    return HttpServerResponse.redirect(maybeGoogleAuthorizationUrl, {
        cookies: Cookies.fromIterable([maybeStateCookie, maybeCodeVerifierCookie]),
    });
}).pipe(makeAstroEndpoint);

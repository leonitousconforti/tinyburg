import type { APIRoute } from "astro";

import { Cookies, HttpServerResponse, UrlParams } from "@effect/platform";
import { Effect, Either, Option, pipe } from "effect";

import { GoogleOAuthConfig } from "./config.ts";

// TODO: managed runtime?
const config = Effect.runSync(GoogleOAuthConfig);

/**
 * GET /api/auth/google/login
 *
 * Initiates the Google OAuth2.0 flow by redirecting to Google's authorization
 * page.
 */
export const GET: APIRoute = async () => {
    const state = "asdf"; // FIXME: implement a proper random string generator
    const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const redirectUrl = pipe(
        UrlParams.empty,
        UrlParams.set("client_id", config.clientId),
        UrlParams.set("redirect_uri", config.redirectUri),
        UrlParams.set("response_type", "code"),
        UrlParams.set("scope", "openid email profile"),
        UrlParams.set("state", state),
        UrlParams.set("access_type", "offline"),
        UrlParams.set("prompt", "consent"),
        (urlParams) => UrlParams.makeUrl(googleAuthUrl, urlParams, Option.none()),
        Either.getOrUndefined
    );

    if (redirectUrl === undefined) {
        return new Response(null, {
            status: 500,
            statusText: "Internal Server Error",
        });
    }

    const cookies = pipe(
        Cookies.empty,
        Cookies.set("google_oauth_state", state, {
            maxAge: 60 * 10, // 10 minutes
            httpOnly: true,
            path: "/",
            secure: true, // only add when deploying with https (prod)
            sameSite: "lax", // optional - do not use "strict"
        }),
        Either.getOrUndefined
    );

    if (cookies === undefined) {
        return new Response(null, {
            status: 500,
            statusText: "Internal Server Error",
        });
    }

    return HttpServerResponse.toWeb(HttpServerResponse.redirect(redirectUrl, { cookies }));
};

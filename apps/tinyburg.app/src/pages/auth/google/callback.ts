import {
    Cookies,
    HttpBody,
    HttpClient,
    HttpClientRequest,
    HttpServerRequest,
    HttpServerResponse,
    UrlParams,
} from "@effect/platform";
import { DateTime, Effect, Option, pipe, Schema, String } from "effect";

import { makeAstroEndpoint } from "../../../../api/handler";
import { AstroContext } from "../../../../api/tags";
import { Repository } from "../../../../domain/model";
import { OAuthResponseSchema } from "../_shared";
import { GoogleOAuthConfig, tokenUrl } from "./_shared";

export const GET = await Effect.gen(function* () {
    const config = yield* Effect.orDie(GoogleOAuthConfig);
    const request = yield* HttpServerRequest.HttpServerRequest;

    // Parse query parameters
    const urlParams = yield* Schema.decodeUnknown(
        Schema.Union(
            Schema.Struct({
                error: Schema.String,
            }),
            Schema.Struct({
                code: Schema.String,
                state: Schema.String,
            })
        )
    )(HttpServerRequest.searchParamsFromURL(new URL(request.originalUrl)));

    // Handle error from OAuth provider
    if ("error" in urlParams) {
        return yield* Effect.dieMessage(`Google OAuth error: ${urlParams.error}`);
    }

    // Retrieve cookies
    const stateCookie = Option.fromNullable(request.cookies["google_oauth_state"]);
    const codeVerifierCookie = Option.fromNullable(request.cookies["google_oauth_verifier"]);

    // Check state parameter to prevent CSRF attacks
    if (Option.isNone(stateCookie) || Option.isNone(codeVerifierCookie) || stateCookie.value !== urlParams.state) {
        return yield* Effect.dieMessage("Invalid state parameter in Google OAuth callback");
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
        Effect.flatMap(Schema.decodeUnknown(OAuthResponseSchema))
    );

    // The state cookie has served its purpose, delete it
    const deleteStateCookie = Cookies.unsafeMakeCookie("google_oauth_state", String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // The code verifier cookie has served its purpose, delete it
    const deleteCodeVerifierCookie = Cookies.unsafeMakeCookie("google_oauth_verifier", String.empty, {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Upsert the user
    const claims = tokens.id_token;
    const providerAccountId = claims.sub;
    const avatarUrl = Option.fromNullable(claims.picture as string | undefined);
    const displayName = yield* Option.fromNullable(claims.name as string | undefined);
    const user = yield* Repository.upsertUserFromOAuth({
        provider: "google",
        displayName,
        providerAccountId,
        avatarUrl,
    });

    // Create a session for the user
    const session = yield* Repository.createSession(user);
    const sessionCookie = Cookies.unsafeMakeCookie("session_id", session.id, {
        expires: DateTime.toDateUtc(session.expiresAt),
        httpOnly: true,
        path: "/",
        secure: import.meta.env.PROD, // only add when deploying with https (prod)
        sameSite: "lax", // optional - do not use "strict"
    });

    // Redirect to the user's towers page
    return HttpServerResponse.redirect("/towers/@me", {
        cookies: Cookies.fromIterable([sessionCookie, deleteStateCookie, deleteCodeVerifierCookie]),
    });
}).pipe(
    Effect.orDie,
    Effect.catchAllDefect((_defect) =>
        pipe(
            AstroContext,
            Effect.flatMap((Astro) => Effect.promise(() => Astro.rewrite("/500"))),
            Effect.map(HttpServerResponse.fromWeb)
        )
    ),
    makeAstroEndpoint
);

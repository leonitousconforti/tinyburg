import type { APIRoute } from "astro";
import { Effect, Option, Redacted } from "effect";

import { Repository } from "../../../../../domain/model.ts";
import { runPromise } from "../../../../../lib/db.ts";
import {
    createSessionCookie,
    exchangeGoogleCode,
    getGoogleUserInfo,
    GoogleOAuthConfig,
    OAUTH_STATE_COOKIE_NAME,
    parseCookies,
} from "../../../../../lib/oauth.ts";

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google, exchanges the code for tokens,
 * fetches user info, and creates a session.
 */
export const GET: APIRoute = async ({ redirect, request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
        return redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    // Validate code and state
    if (!code || !state) {
        return redirect("/login?error=missing_params");
    }

    // Validate state matches cookie (CSRF protection)
    const cookies = parseCookies(request.headers.get("cookie"));
    const storedState = cookies[OAUTH_STATE_COOKIE_NAME];

    if (!storedState || storedState !== state) {
        return redirect("/login?error=invalid_state");
    }

    try {
        // Get OAuth config
        const config = await Effect.runPromise(GoogleOAuthConfig);

        // Exchange code for tokens
        const tokens = await exchangeGoogleCode(
            code,
            config.clientId,
            Redacted.value(config.clientSecret),
            config.redirectUri
        );

        // Get user info
        const userInfo = await getGoogleUserInfo(tokens.access_token);

        // Calculate token expiration
        const expiresAt = tokens.expires_in
            ? Option.some(new Date(Date.now() + tokens.expires_in * 1000))
            : Option.none();

        // Create or update user and session
        const session = await runPromise(
            Effect.gen(function* () {
                const repo = yield* Repository;

                // Upsert user from OAuth data
                const user = yield* repo.upsertUserFromOAuth({
                    provider: "google",
                    providerAccountId: userInfo.id,
                    displayName: userInfo.name,
                    email: userInfo.email ? Option.some(userInfo.email) : Option.none(),
                    avatarUrl: userInfo.picture ? Option.some(userInfo.picture) : Option.none(),
                    accessToken: Option.some(tokens.access_token),
                    refreshToken: tokens.refresh_token ? Option.some(tokens.refresh_token) : Option.none(),
                    expiresAt,
                });

                // Create session
                return yield* repo.createSession(user.id);
            })
        );

        // Redirect to home with session cookie
        return new Response(null, {
            status: 302,
            headers: {
                Location: "/",
                "Set-Cookie": createSessionCookie(session.id),
            },
        });
    } catch (err) {
        console.error("Google OAuth error:", err);
        return redirect("/login?error=oauth_failed");
    }
};

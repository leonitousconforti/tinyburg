import type { APIRoute } from "astro";
import { Effect } from "effect";

import { createStateCookie, DiscordOAuthConfig, generateState, getDiscordAuthUrl } from "../../../../../lib/oauth.ts";

/**
 * GET /api/auth/discord/login
 *
 * Initiates the Discord OAuth flow by redirecting to Discord's authorization
 * page.
 */
export const GET: APIRoute = async () => {
    const configEffect = Effect.runPromise(DiscordOAuthConfig);

    try {
        const config = await configEffect;
        const state = generateState();
        const authUrl = getDiscordAuthUrl(config.clientId, config.redirectUri, state);

        // Set state cookie for CSRF protection
        return new Response(null, {
            status: 302,
            headers: {
                Location: authUrl,
                "Set-Cookie": createStateCookie(state),
            },
        });
    } catch {
        return new Response("OAuth configuration error", { status: 500 });
    }
};

import type { APIRoute } from "astro";
import { Effect } from "effect";

import { Repository } from "../../../../domain/model.ts";
import { runPromise } from "../../../../lib/db.ts";
import { clearSessionCookie, parseCookies, SESSION_COOKIE_NAME } from "../../../../lib/oauth.ts";

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by deleting their session.
 */
export const POST: APIRoute = async ({ request }) => {
    const cookies = parseCookies(request.headers.get("cookie"));
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (sessionId) {
        try {
            await runPromise(
                Effect.gen(function* () {
                    const repo = yield* Repository;
                    yield* repo.deleteSession(sessionId);
                })
            );
        } catch {
            // Ignore errors during logout
        }
    }

    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie": clearSessionCookie(),
        },
    });
};

/**
 * GET /api/auth/logout
 *
 * Also support GET for simple logout links.
 */
export const GET: APIRoute = POST;

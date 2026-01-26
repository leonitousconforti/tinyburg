import type { APIRoute } from "astro";
import { Effect, Option } from "effect";

import { Repository } from "../../../domain/model.ts";
import { runPromise } from "../../../lib/db.ts";
import { parseCookies, SESSION_COOKIE_NAME } from "../../../lib/oauth.ts";

/**
 * GET /api/auth/me
 *
 * Returns the current user's information if authenticated.
 */
export const GET: APIRoute = async ({ request }) => {
    const cookies = parseCookies(request.headers.get("cookie"));
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const userOption = await runPromise(
            Effect.gen(function* () {
                const repo = yield* Repository;
                return yield* repo.getUserFromSession(sessionId);
            })
        );

        if (Option.isNone(userOption)) {
            return new Response(JSON.stringify({ authenticated: false }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const user = userOption.value;

        return new Response(
            JSON.stringify({
                authenticated: true,
                user: {
                    id: user.id,
                    displayName: user.displayName,
                    avatarUrl: Option.getOrNull(user.avatarUrl),
                    email: Option.getOrNull(user.email),
                },
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
};

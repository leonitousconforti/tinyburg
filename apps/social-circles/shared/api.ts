import { Context, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiMiddleware } from "effect/unstable/httpapi";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { Session } from "../domain/sessions.ts";

/**
 * The session in context, provided by the {@link SessionCookie} middleware.
 *
 * @since 1.0.0
 * @category Tags
 */
export class CurrentSession extends Context.Service<
    CurrentSession,
    {
        readonly session: Session;
    }
>()("@tinyburg/social-circles/shared/api/CurrentSession") {}

/**
 * Turns the session cookie into a {@link CurrentSession}, or fails
 * Unauthorized. Defined here so the server handler and the derived browser
 * client speak the same spec.
 *
 * The error is an array rather than a `Schema.Union`, which would collapse the
 * distinct statuses into a single 500.
 *
 * @since 1.0.0
 * @category Middlewares
 */
export class SessionCookie extends HttpApiMiddleware.Service<SessionCookie, { provides: CurrentSession }>()(
    "@tinyburg/social-circles/shared/api/SessionCookie",
    { error: [HttpApiError.Unauthorized, HttpApiError.InternalServerError] }
) {}

/**
 * One of the visitor's linked TinyTower accounts, and where it stands with the
 * study.
 *
 * `linked` comes from tinyburg.app and is the ownership proof; `enrolled` is
 * this study's own consent record. The dashboard needs both to say anything
 * useful, and keeping them distinct is what stops "you linked it" from being
 * mistaken for "you agreed to take part".
 *
 * @since 1.0.0
 * @category Models
 */
export const TowerStatus = Schema.Struct({
    playerId: PlayerIdSchema,
    enrolled: Schema.Boolean,
    /** How many of this player's friends are also in the study. */
    circleSize: Schema.Finite,
    /** Total friends seen at the last crawl, so the sampling rate is visible. */
    totalFriends: Schema.Finite,
    /** Null until the first successful crawl lands. */
    lastCrawledAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromString, { onNoneEncoding: null }),
});
export type TowerStatus = typeof TowerStatus.Type;

/**
 * The mutual friendships the study holds for one player.
 *
 * Only mutuals, and only between consenting players, so nothing here is a fact
 * about somebody who did not opt in.
 *
 * @since 1.0.0
 * @category Models
 */
export const Circle = Schema.Struct({
    playerId: PlayerIdSchema,
    friends: Schema.Array(PlayerIdSchema),
    totalFriends: Schema.Finite,
});
export type Circle = typeof Circle.Type;

const playerParam = { playerId: PlayerIdSchema };

const SelfServiceGroup = HttpApiGroup.make("SelfServiceGroup")
    .add(
        HttpApiEndpoint.get("session", "/self/session", {
            success: Session.json,
        })
    )
    .add(
        // Reaches tinyburg.app on the visitor's behalf, so it can fail in ways
        // the other endpoints cannot: ServiceUnavailable is the provider being
        // unreachable, not the visitor doing anything wrong.
        HttpApiEndpoint.get("towers", "/self/towers", {
            error: HttpApiError.ServiceUnavailable,
            success: Schema.Array(TowerStatus),
        })
    )
    .add(
        HttpApiEndpoint.post("enroll", "/self/towers/:playerId/enroll", {
            params: playerParam,
            // Forbidden means the player is not linked to this account, which
            // is the ownership gate refusing.
            error: [HttpApiError.Forbidden, HttpApiError.ServiceUnavailable],
            success: Schema.Struct({ crawled: Schema.Boolean }),
        })
    )
    .add(
        HttpApiEndpoint.delete("withdraw", "/self/towers/:playerId", {
            params: playerParam,
            error: HttpApiError.NotFound,
            success: Schema.Struct({
                edgesRemoved: Schema.Finite,
                eventsRemoved: Schema.Finite,
            }),
        })
    )
    .add(
        HttpApiEndpoint.get("circle", "/self/towers/:playerId/circle", {
            params: playerParam,
            error: [HttpApiError.Forbidden, HttpApiError.NotFound],
            success: Circle,
        })
    )
    .middleware(SessionCookie);

/**
 * The cookie-session api behind the dashboard: who is signed in, which towers
 * they own, and what the study holds about each.
 *
 * @since 1.0.0
 * @category Api
 */
export const SelfServiceApi = HttpApi.make("SocialCirclesSelfServiceApi").add(SelfServiceGroup);

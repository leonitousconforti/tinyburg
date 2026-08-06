import { Context, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiMiddleware } from "effect/unstable/httpapi";

import { Account } from "../domain/model.ts";
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
>()("@tinyburg/authproxy/shared/api/CurrentSession") {}

/**
 * Turns the session cookie into a {@link CurrentSession}, or fails
 * Unauthorized. Defined here so both the server handler and the derived
 * browser client speak the same spec.
 *
 * @since 1.0.0
 * @category Middlewares
 */
export class SessionCookie extends HttpApiMiddleware.Service<SessionCookie, { provides: CurrentSession }>()(
    "@tinyburg/authproxy/shared/api/SessionCookie",
    { error: [HttpApiError.Unauthorized, HttpApiError.InternalServerError] }
) {}

/**
 * Like {@link SessionCookie}, but additionally requires the session's
 * step-up elevation window to be open: Forbidden for a plain session.
 *
 * @since 1.0.0
 * @category Middlewares
 */
export class AdminSessionCookie extends HttpApiMiddleware.Service<AdminSessionCookie, { provides: CurrentSession }>()(
    "@tinyburg/authproxy/shared/api/AdminSessionCookie",
    { error: [HttpApiError.Unauthorized, HttpApiError.Forbidden, HttpApiError.InternalServerError] }
) {}

const keyParam = { key: Schema.String.check(Schema.isUUID()) };

const SelfServiceGroup = HttpApiGroup.make("SelfServiceGroup")
    .add(
        HttpApiEndpoint.get("session", "/self/session", {
            success: Session.json,
        })
    )
    .add(
        HttpApiEndpoint.get("listKeys", "/self/keys", {
            success: Schema.Array(Account.json),
        })
    )
    .add(
        HttpApiEndpoint.post("createKey", "/self/keys", {
            payload: Schema.Struct({
                scopes: Schema.Array(Schema.String),
                description: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
            }),
            error: HttpApiError.BadRequest,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.post("rotateKey", "/self/keys/:key/rotate", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.put("revokeKey", "/self/keys/:key/revoke", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.put("enableKey", "/self/keys/:key/enable", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.delete("deleteKey", "/self/keys/:key", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Schema.Void,
        })
    )
    .add(
        // Step-up: the admin password plus a live check that the session's
        // sub holds an allowlisted tower. Failure is uniformly Forbidden so
        // it never says which factor was wrong.
        HttpApiEndpoint.post("elevate", "/self/elevate", {
            payload: Schema.Struct({ password: Schema.String }),
            error: HttpApiError.Forbidden,
            success: Session.json,
        })
    )
    .middleware(SessionCookie);

const AdminGroup = HttpApiGroup.make("AdminGroup")
    .add(
        HttpApiEndpoint.get("listKeys", "/self/admin/keys", {
            success: Schema.Array(Account.json),
        })
    )
    .add(
        HttpApiEndpoint.patch("scopes", "/self/admin/keys/:key/scopes", {
            params: keyParam,
            payload: Schema.Struct({ scopes: Schema.Array(Schema.String) }),
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.patch("rateLimit", "/self/admin/keys/:key/ratelimit", {
            params: keyParam,
            payload: Schema.Struct({ limit: Schema.Int, window: Schema.DurationFromMillis }),
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.put("revoke", "/self/admin/keys/:key/revoke", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.put("enable", "/self/admin/keys/:key/enable", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Account.json,
        })
    )
    .add(
        HttpApiEndpoint.delete("deleteKey", "/self/admin/keys/:key", {
            params: keyParam,
            error: HttpApiError.NotFound,
            success: Schema.Void,
        })
    )
    .middleware(AdminSessionCookie);

/**
 * The cookie-session api behind the self-service dashboard: who is signed in
 * and the keys they hold, plus the elevated admin surface.
 *
 * @since 1.0.0
 * @category Api
 */
export const SelfServiceApi = HttpApi.make("SelfServiceApi").add(SelfServiceGroup).add(AdminGroup);

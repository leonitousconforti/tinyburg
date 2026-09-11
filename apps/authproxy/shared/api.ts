import { Context, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiMiddleware } from "effect/unstable/httpapi";

import { ApiKey } from "../domain/model.ts";
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

/**
 * One scope as the dashboard lists it: the name a key carries, the sentence
 * shown beside it, and whether a visitor may grant it to themselves.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ScopeCatalogNode = Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    selfServe: Schema.Boolean,
});

/**
 * A `:read` or `:write` branch and the leaves it grants.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ScopeCatalogBranch = Schema.Struct({
    ...ScopeCatalogNode.fields,
    children: Schema.Array(ScopeCatalogNode),
});

/**
 * One area of the api, granting both of its branches.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ScopeCatalogArea = Schema.Struct({
    ...ScopeCatalogNode.fields,
    read: ScopeCatalogBranch,
    write: ScopeCatalogBranch,
});

/**
 * A game: its own `:read` and `:write` branches, which span every area, and
 * the areas beneath it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ScopeCatalogGame = Schema.Struct({
    ...ScopeCatalogNode.fields,
    read: ScopeCatalogNode,
    write: ScopeCatalogNode,
    areas: Schema.Array(ScopeCatalogArea),
});

/**
 * The scope catalog, served rather than bundled. It is read off the TinyTower
 * endpoint definitions on the server, which the browser has no reason to
 * carry for the sake of a tree of strings. Public: it describes what the proxy
 * can do, not who may do it.
 */
const ScopesGroup = HttpApiGroup.make("ScopesGroup").add(
    HttpApiEndpoint.get("catalog", "/self/scopes", {
        success: Schema.Array(ScopeCatalogGame),
    })
);

const SelfServiceGroup = HttpApiGroup.make("SelfServiceGroup")
    .add(
        HttpApiEndpoint.get("session", "/self/session", {
            success: Session.json,
        })
    )
    .add(
        HttpApiEndpoint.get("listKeys", "/self/keys", {
            success: Schema.Array(ApiKey.json),
        })
    )
    .add(
        HttpApiEndpoint.post("createKey", "/self/keys", {
            payload: Schema.Struct({
                scopes: Schema.Array(Schema.String),
                description: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
            }),
            error: HttpApiError.BadRequest,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.post("rotateKey", "/self/keys/:key/rotate", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.put("revokeKey", "/self/keys/:key/revoke", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.put("enableKey", "/self/keys/:key/enable", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.delete("deleteKey", "/self/keys/:key", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: Schema.Void,
        })
    )
    .middleware(SessionCookie);

const AdminGroup = HttpApiGroup.make("AdminGroup")
    .add(
        HttpApiEndpoint.get("listKeys", "/self/admin/keys", {
            success: Schema.Array(ApiKey.json),
        })
    )
    .add(
        HttpApiEndpoint.patch("scopes", "/self/admin/keys/:key/scopes", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            payload: Schema.Struct({ scopes: Schema.Array(Schema.String) }),
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.patch("rateLimit", "/self/admin/keys/:key/ratelimit", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            payload: Schema.Struct({ limit: Schema.Int, window: Schema.DurationFromMillis }),
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.put("revoke", "/self/admin/keys/:key/revoke", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.put("enable", "/self/admin/keys/:key/enable", {
            params: { key: Schema.String.check(Schema.isUUID()) },
            error: HttpApiError.NotFound,
            success: ApiKey.json,
        })
    )
    .add(
        HttpApiEndpoint.delete("deleteKey", "/self/admin/keys/:key", {
            params: { key: Schema.String.check(Schema.isUUID()) },
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
export const SelfServiceApi = HttpApi.make("SelfServiceApi").add(ScopesGroup).add(SelfServiceGroup).add(AdminGroup);

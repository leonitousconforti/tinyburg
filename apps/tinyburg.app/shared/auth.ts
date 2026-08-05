import { Context, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiMiddleware } from "effect/unstable/httpapi";

import { OAuthAccount, Session, User } from "../domain/models.ts";

export class CurrentSession extends Context.Service<
    CurrentSession,
    {
        readonly session: Session;
        readonly user: User;
    }
>()("@tinyburg/tinyburg.app/shared/auth/CurrentSession") {}

export class SessionCookie extends HttpApiMiddleware.Service<SessionCookie, { provides: CurrentSession }>()(
    "@tinyburg/tinyburg.app/shared/auth/SessionCookie",
    { error: Schema.Union([HttpApiError.Unauthorized, HttpApiError.InternalServerError]) }
) {}

const AuthGroup = HttpApiGroup.make("AuthGroup")
    .add(
        HttpApiEndpoint.get("session", "/auth/session", {
            success: User.json,
        })
    )
    .add(
        HttpApiEndpoint.get("sessions", "/auth/sessions", {
            success: Schema.Array(
                Schema.Struct({
                    ...Session.json.fields,
                    current: Schema.Boolean,
                })
            ),
        })
    )
    .add(
        HttpApiEndpoint.delete("revokeSession", "/auth/sessions/:sessionId", {
            params: { sessionId: Schema.String.check(Schema.isUUID()) },
            success: Schema.Struct({
                signedOut: Schema.Boolean,
                revoked: Schema.Number,
            }),
        })
    )
    .add(
        HttpApiEndpoint.delete("revokeSessions", "/auth/sessions", {
            query: { scope: Schema.Literals(["others", "all"]) },
            success: Schema.Struct({
                signedOut: Schema.Boolean,
                revoked: Schema.Number,
            }),
        })
    )
    .add(
        HttpApiEndpoint.get("accounts", "/auth/accounts", {
            success: Schema.Array(OAuthAccount.json),
        })
    )
    .add(
        HttpApiEndpoint.delete("unlinkAccount", "/auth/accounts/:provider/:providerAccountId", {
            params: { provider: OAuthAccount.fields.provider, providerAccountId: Schema.String },
            error: HttpApiError.Conflict,
        })
    )
    .middleware(SessionCookie);

export const AuthApi = HttpApi.make("AuthApi").add(AuthGroup);

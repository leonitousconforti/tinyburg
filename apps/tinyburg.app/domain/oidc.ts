import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

import { OAuthAuthorizationRequest, OAuthConsent } from "./models.ts";

export class OIDCRepository extends Context.Service<OIDCRepository>()("@tinyburg/tinyburg.app/domain/OIDCRepository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const oauthAuthorizationRequests = yield* SqlModel.makeRepository(OAuthAuthorizationRequest, {
            spanPrefix: "tinyburg.app.domain.Repository.oauthAuthorizationRequests",
            tableName: "oauth_authorization_requests",
            idColumn: "id",
        });

        const createAuthorizationRequest = oauthAuthorizationRequests.insert;
        const deleteAuthorizationRequest = oauthAuthorizationRequests.delete;
        const findAuthorizationRequest = SqlSchema.findOneOption({
            Request: Schema.String.check(Schema.isUUID()),
            Result: OAuthAuthorizationRequest,
            execute: (requestId) => sql`
                SELECT * FROM oauth_authorization_requests
                WHERE id = ${requestId} AND code_hash IS NULL AND expires_at > NOW()
            `,
        });

        const approveAuthorizationRequest = SqlSchema.findOneOption({
            Request: Schema.Struct({
                requestId: Schema.String.check(Schema.isUUID()),
                userId: Schema.String.check(Schema.isUUID()),
                codeHash: Schema.String,
            }),
            Result: OAuthAuthorizationRequest,
            execute: ({ codeHash, requestId, userId }) => sql`
                UPDATE oauth_authorization_requests
                SET code_hash = ${codeHash}, expires_at = NOW() + INTERVAL '5 minutes'
                WHERE id = ${requestId} AND user_id = ${userId} AND code_hash IS NULL AND expires_at > NOW()
                RETURNING *
            `,
        });

        const consumeAuthorizationCode = SqlSchema.findOneOption({
            Request: Schema.String,
            Result: OAuthAuthorizationRequest,
            execute: (codeHash) => sql`
                DELETE FROM oauth_authorization_requests
                WHERE code_hash = ${codeHash} AND expires_at > NOW()
                RETURNING *
            `,
        });

        const findConsent = SqlSchema.findOneOption({
            Request: Schema.Struct({
                userId: Schema.String.check(Schema.isUUID()),
                clientId: Schema.String.check(Schema.isUUID()),
            }),
            Result: OAuthConsent,
            execute: ({ clientId, userId }) => sql`
                SELECT * FROM oauth_consents WHERE user_id = ${userId} AND client_id = ${clientId}
            `,
        });

        const upsertConsent = (options: { userId: string; clientId: string; scope: string }) =>
            sql`
                INSERT INTO oauth_consents (user_id, client_id, scope)
                VALUES (${options.userId}, ${options.clientId}, ${options.scope})
                ON CONFLICT (user_id, client_id)
                DO UPDATE SET scope = EXCLUDED.scope, granted_at = NOW()
            `.pipe(Effect.asVoid);

        return {
            createAuthorizationRequest,
            findAuthorizationRequest,
            deleteAuthorizationRequest,
            approveAuthorizationRequest,
            consumeAuthorizationCode,
            findConsent,
            upsertConsent,
        };
    }),
}) {
    static readonly Default = Layer.effect(this, OIDCRepository.make);
}

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

import { OAuthAuthorizationRequest } from "./models.ts";

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

        // Housekeeping rides along on writes so the denylist stays bounded
        // without a scheduled job.
        const revokeToken = (options: { jti: string; expiresAt: Date }) =>
            Effect.andThen(
                sql`DELETE FROM revoked_tokens WHERE expires_at < NOW()`,
                sql`
                    INSERT INTO revoked_tokens (jti, expires_at)
                    VALUES (${options.jti}, ${options.expiresAt})
                    ON CONFLICT (jti) DO NOTHING
                `
            ).pipe(Effect.asVoid);

        const isTokenRevoked = (jti: string) =>
            Effect.map(
                sql`SELECT 1 FROM revoked_tokens WHERE jti = ${jti} AND expires_at > NOW()`,
                (rows) => rows.length > 0
            );

        return {
            createAuthorizationRequest,
            findAuthorizationRequest,
            deleteAuthorizationRequest,
            approveAuthorizationRequest,
            consumeAuthorizationCode,
            revokeToken,
            isTokenRevoked,
        };
    }),
}) {
    static readonly Default = Layer.effect(this, OIDCRepository.make);
}

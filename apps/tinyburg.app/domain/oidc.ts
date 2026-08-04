import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

import { OAuthAuthorizationRequest } from "./models.ts";

export class OidcRepository extends Context.Service<OidcRepository>()("@tinyburg/tinyburg.app/domain/OidcRepository", {
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

        const revokeToken = (options: {
            readonly jti: string;
            readonly expiresAt: Date;
        }): Effect.Effect<void, SqlError.SqlError, never> =>
            sql`
                INSERT INTO revoked_tokens (jti, expires_at)
                VALUES (${options.jti}, ${options.expiresAt})
                ON CONFLICT (jti) DO NOTHING
            `.pipe(Effect.asVoid);

        const isTokenRevoked = (jti: string): Effect.Effect<boolean, SqlError.SqlError, never> =>
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
    static readonly Default = Layer.effect(this, OidcRepository.make);
}

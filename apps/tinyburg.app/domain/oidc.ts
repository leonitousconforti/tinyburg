import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schedule, Schema } from "effect";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

import { OAuthAuthorizationRequest, RefreshToken } from "./models.ts";

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

        /**
         * Stores a refresh token.
         *
         * The caller supplies `familyId`: a fresh authorization mints a new one,
         * a rotation passes down the family it descends from. Generating it here
         * would hide which of those two happened.
         */
        const createRefreshToken = (options: {
            readonly tokenHash: string;
            readonly clientId: string;
            readonly userId: string;
            readonly scope: string;
            readonly expiresAt: Date;
            readonly familyId: string;
        }): Effect.Effect<void, SqlError.SqlError, never> =>
            sql`
                INSERT INTO refresh_tokens (token_hash, client_id, user_id, scope, expires_at, family_id)
                VALUES (
                    ${options.tokenHash},
                    ${options.clientId},
                    ${options.userId},
                    ${options.scope},
                    ${options.expiresAt},
                    ${options.familyId}
                )
            `.pipe(Effect.asVoid);

        /**
         * Looks a refresh token up by hash, whatever state it is in.
         *
         * Consumed and revoked rows are returned rather than filtered out,
         * because "this token exists but was already used" is precisely the
         * signal reuse detection needs. Filtering here would make a replay
         * indistinguishable from a token that never existed.
         */
        const findRefreshToken = SqlSchema.findOneOption({
            Request: Schema.String,
            Result: RefreshToken,
            execute: (tokenHash) => sql`
                SELECT * FROM refresh_tokens WHERE token_hash = ${tokenHash}
            `,
        });

        /**
         * Marks a token spent, but only if it was still live.
         *
         * The `consumed_at IS NULL AND revoked_at IS NULL` guard is what makes
         * this safe under concurrency: two simultaneous refreshes with the same
         * token both try this, exactly one updates a row, and the loser is
         * treated as a replay. Checking in application code first would leave a
         * window where both succeed.
         */
        const consumeRefreshToken = (tokenHash: string): Effect.Effect<boolean, SqlError.SqlError, never> =>
            Effect.map(
                sql`
                    UPDATE refresh_tokens
                    SET consumed_at = NOW()
                    WHERE token_hash = ${tokenHash}
                      AND consumed_at IS NULL
                      AND revoked_at IS NULL
                      AND expires_at > NOW()
                    RETURNING id
                `,
                (rows) => rows.length > 0
            );

        /** Tears down an entire token family, on reuse or explicit revocation. */
        const revokeRefreshTokenFamily = (familyId: string): Effect.Effect<number, SqlError.SqlError, never> =>
            Effect.map(
                sql`
                    UPDATE refresh_tokens
                    SET revoked_at = NOW()
                    WHERE family_id = ${familyId} AND revoked_at IS NULL
                    RETURNING id
                `,
                (rows) => rows.length
            );

        yield* sql`DELETE FROM revoked_tokens WHERE expires_at < NOW()`.pipe(
            Effect.catchCause((cause) => Effect.logWarning(`failed to purge expired revoked tokens`, cause)),
            Effect.schedule(Schedule.cron("23 * * * *")),
            Effect.forkScoped,
            Effect.asVoid
        );

        // Kept a while past expiry: a replayed token is only recognisable as
        // reuse while its row still exists, so deleting on the stroke of expiry
        // would turn a detectable attack into a silent "unknown token".
        yield* sql`DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days'`.pipe(
            Effect.catchCause((cause) => Effect.logWarning(`failed to purge expired refresh tokens`, cause)),
            Effect.schedule(Schedule.cron("47 3 * * *")),
            Effect.forkScoped,
            Effect.asVoid
        );

        yield* sql`DELETE FROM oauth_authorization_requests WHERE expires_at < NOW()`.pipe(
            Effect.catchCause((cause) => Effect.logWarning(`failed to purge expired authorization requests`, cause)),
            Effect.schedule(Schedule.cron("*/15 * * * *")),
            Effect.forkScoped,
            Effect.asVoid
        );

        return {
            createAuthorizationRequest,
            findAuthorizationRequest,
            deleteAuthorizationRequest,
            approveAuthorizationRequest,
            consumeAuthorizationCode,
            revokeToken,
            isTokenRevoked,
            createRefreshToken,
            findRefreshToken,
            consumeRefreshToken,
            revokeRefreshTokenFamily,
        };
    }),
}) {
    static readonly Default = Layer.effect(this, OidcRepository.make);
}

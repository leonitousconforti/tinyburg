/**
 * Storage for the tinyburg.app grants that let the escrow sagas run while
 * the traders are away.
 *
 * The repository deals in sealed strings only. Sealing and unsealing live in
 * `crypto.ts`, and the plaintext refresh token exists nowhere but the moment
 * of use.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { TreasuryGrant } from "./model.ts";

export class GrantsRepository extends Context.Service<GrantsRepository>()(
    "@tinyburg/treasury/domain/GrantsRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * Stores or replaces a user's grant.
             *
             * Upsert rather than insert because a user who reconnects gets a
             * fresh refresh token, and the old one is already worthless. Writing
             * a new row also clears `invalidated_at`, which is how reconnecting
             * puts a previously dead grant back into service.
             */
            const upsert = (options: {
                readonly tinyburgUserId: string;
                readonly refreshTokenCiphertext: string;
                readonly scope: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                INSERT INTO grants (tinyburg_user_id, refresh_token_ciphertext, scope)
                VALUES (${options.tinyburgUserId}, ${options.refreshTokenCiphertext}, ${options.scope})
                ON CONFLICT (tinyburg_user_id) DO UPDATE
                SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
                    scope = EXCLUDED.scope,
                    issued_at = NOW(),
                    invalidated_at = NULL
            `.pipe(Effect.asVoid);

            const findLive = SqlSchema.findOneOption({
                Request: Schema.String.check(Schema.isUUID()),
                Result: TreasuryGrant,
                execute: (tinyburgUserId) => sql`
                SELECT * FROM grants
                WHERE tinyburg_user_id = ${tinyburgUserId} AND invalidated_at IS NULL
            `,
            });

            /**
             * Marks a grant dead after the provider rejects it.
             *
             * Without this every saga that touches the user would retry a token
             * the user revoked upstream, forever, and the failure would look
             * like a transient outage rather than a decision the user made.
             */
            const invalidate = (tinyburgUserId: string): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                UPDATE grants
                SET invalidated_at = NOW()
                WHERE tinyburg_user_id = ${tinyburgUserId} AND invalidated_at IS NULL
            `.pipe(Effect.asVoid);

            return { upsert, findLive, invalidate };
        }),
    }
) {
    static readonly Default = Layer.effect(GrantsRepository, GrantsRepository.make);
}

/**
 * Storage for the tinyburg.app `towers` grants that let the crawl run while the
 * user is away.
 *
 * The repository deals in sealed strings only. Sealing and unsealing live in
 * `crypto.ts`, and the plaintext refresh token exists nowhere but the moment of
 * use.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { TowerGrant } from "./model.ts";

export class GrantsRepository extends Context.Service<GrantsRepository>()(
    "@tinyburg/social-circles/domain/GrantsRepository",
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
                    INSERT INTO tower_grants (tinyburg_user_id, refresh_token_ciphertext, scope)
                    VALUES (${options.tinyburgUserId}, ${options.refreshTokenCiphertext}, ${options.scope})
                    ON CONFLICT (tinyburg_user_id) DO UPDATE
                    SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
                        scope = EXCLUDED.scope,
                        issued_at = NOW(),
                        invalidated_at = NULL
                `.pipe(Effect.asVoid);

            const findLive = SqlSchema.findOneOption({
                Request: Schema.String.check(Schema.isUUID()),
                Result: TowerGrant,
                execute: (tinyburgUserId) => sql`
                    SELECT * FROM tower_grants
                    WHERE tinyburg_user_id = ${tinyburgUserId} AND invalidated_at IS NULL
                `,
            });

            /**
             * Marks a grant dead after the provider rejects it.
             *
             * Without this the scheduler would retry a token the user revoked
             * upstream on every tick, forever, and the failure would look like a
             * transient outage rather than a decision the user made.
             */
            const invalidate = (tinyburgUserId: string): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    UPDATE tower_grants
                    SET invalidated_at = NOW()
                    WHERE tinyburg_user_id = ${tinyburgUserId} AND invalidated_at IS NULL
                `.pipe(Effect.asVoid);

            /**
             * The user who can act for a player, if the study still holds a
             * usable grant for them.
             */
            const findUserForPlayer = (
                playerId: string
            ): Effect.Effect<Option.Option<string>, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        SELECT g.tinyburg_user_id
                        FROM tower_grants g
                        JOIN consents c ON c.tinyburg_user_id = g.tinyburg_user_id
                        WHERE c.player_id = ${playerId}
                          AND c.revoked_at IS NULL
                          AND g.invalidated_at IS NULL
                        LIMIT 1
                    `,
                    (rows) => Option.fromNullishOr(rows[0]?.["tinyburgUserId"] as string | undefined)
                );

            return {
                upsert,
                findLive,
                invalidate,
                findUserForPlayer,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(GrantsRepository, GrantsRepository.make);
}

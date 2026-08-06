/**
 * Consent is the gate for the entire study.
 *
 * Everything downstream (which players get crawled, which edges may be stored,
 * what a purge has to remove) is derived from the live consent set defined
 * here, and nowhere else.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { Consent, type PlayerId } from "./model.ts";

export class ConsentRepository extends Context.Service<ConsentRepository>()(
    "@tinyburg/social-circles/domain/ConsentRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * The seed set for every crawl.
             *
             * The previous implementation derived this from the
             * `current_friendships` view, which is a view over *edges*. At
             * bootstrap there are no edges, so the crawl found nobody, wrote
             * nothing, and therefore still had no edges on the next run. The
             * study could never start. Consent records are the correct source:
             * they exist before any edge does.
             */
            const consentedPlayers = SqlSchema.findAll({
                Request: Schema.Void,
                Result: PlayerIdSchema,
                execute: () =>
                    sql`
                        SELECT player_id
                        FROM consents
                        WHERE revoked_at IS NULL
                    `.pipe(Effect.map((rows) => rows.map(({ playerId }) => playerId))),
            });

            /** Whether a player may appear in the graph at all, in either role. */
            const hasLiveConsent = (playerId: PlayerId): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`SELECT 1 FROM consents WHERE player_id = ${playerId} AND revoked_at IS NULL`,
                    (rows) => rows.length > 0
                );

            const findForUser = SqlSchema.findAll({
                Request: Schema.String.check(Schema.isUUID()),
                Result: Consent,
                execute: (tinyburgUserId) => sql`
                    SELECT * FROM consents
                    WHERE tinyburg_user_id = ${tinyburgUserId}
                    ORDER BY granted_at DESC
                `,
            });

            /**
             * Records consent, creating the player row if this is the first time
             * the id has been seen.
             *
             * Idempotent by way of the partial unique index on live consents, so
             * a workflow that replays this step does not stack duplicate grants.
             */
            const grant = (options: {
                readonly tinyburgUserId: string;
                readonly playerId: PlayerId;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    WITH ensured_player AS (
                        INSERT INTO players (player_id) VALUES (${options.playerId})
                        ON CONFLICT (player_id) DO NOTHING
                    )
                    INSERT INTO consents (tinyburg_user_id, player_id)
                    VALUES (${options.tinyburgUserId}, ${options.playerId})
                    ON CONFLICT DO NOTHING
                `.pipe(Effect.asVoid);

            /**
             * Withdraws consent.
             *
             * Scoped to the granting user so a friend code alone cannot revoke
             * someone else's participation. This closes the hole in the old
             * `purge(playerIdString)`, which took an unauthenticated string and
             * would happily delete anybody's data.
             *
             * Revoking only marks the record. Removing the data is the purge
             * workflow's job, and it wants the consent row intact while it runs.
             */
            const revoke = (options: {
                readonly tinyburgUserId: string;
                readonly playerId: PlayerId;
            }): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        UPDATE consents
                        SET revoked_at = NOW()
                        WHERE player_id = ${options.playerId}
                          AND tinyburg_user_id = ${options.tinyburgUserId}
                          AND revoked_at IS NULL
                        RETURNING id
                    `,
                    (rows) => rows.length > 0
                );

            return {
                consentedPlayers,
                hasLiveConsent,
                findForUser,
                grant,
                revoke,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(ConsentRepository, ConsentRepository.make);
}

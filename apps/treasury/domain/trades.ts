/**
 * The trade book, and the only door to it.
 *
 * Every state change is a guarded UPDATE: the allowed source states ride in
 * the WHERE clause and the caller learns whether the transition took. That
 * single shape is what collapses every race in the treasury - double
 * accepts, cancel against an escrow already running, an expiry sweep against
 * a settlement - into "one writer won, the other observed `false`".
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import type { TradeState } from "@tinyburg/treasury-sdk/Sdk";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { TradeGame, TradeMechanism } from "@tinyburg/treasury-sdk/Sdk";

import { Trade } from "./model.ts";

type TradeStateValue = typeof TradeState.Type;

const uuid = Schema.String.check(Schema.isUUID());

export class TradesRepository extends Context.Service<TradesRepository>()(
    "@tinyburg/treasury/domain/TradesRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const create = SqlSchema.findOne({
                Request: Schema.Struct({
                    mechanism: TradeMechanism,
                    game: TradeGame,
                    proposerUserId: uuid,
                    proposerPlayerId: PlayerIdSchema,
                    counterpartyPlayerId: Schema.OptionFromNullishOr(PlayerIdSchema, { onNoneEncoding: null }),
                    gives: Schema.String,
                    wants: Schema.String,
                    expiresAt: Schema.DateTimeUtcFromDate,
                }),
                Result: Trade,
                execute: (trade) => sql`
                INSERT INTO trades (
                    mechanism, game, proposer_user_id, proposer_player_id,
                    counterparty_player_id, gives, wants, expires_at
                )
                VALUES (
                    ${trade.mechanism}, ${trade.game}, ${trade.proposerUserId}, ${trade.proposerPlayerId},
                    ${trade.counterpartyPlayerId}, ${trade.gives}, ${trade.wants}, ${trade.expiresAt}
                )
                RETURNING *
            `,
            });

            const byId = SqlSchema.findOneOption({
                Request: uuid,
                Result: Trade,
                execute: (tradeId) => sql`SELECT * FROM trades WHERE id = ${tradeId}`,
            });

            /**
             * The trades a visitor sees: both sides of their own, plus the open
             * offers anyone could take. Open offers past their expiry are not
             * anyone's business anymore, but a participant keeps seeing their
             * trade whatever state it reaches.
             */
            const listForUser = SqlSchema.findAll({
                Request: uuid,
                Result: Trade,
                execute: (userId) => sql`
                SELECT * FROM trades
                WHERE proposer_user_id = ${userId}
                   OR counterparty_user_id = ${userId}
                   OR (state = 'proposed' AND counterparty_user_id IS NULL
                       AND counterparty_player_id IS NULL AND expires_at > NOW())
                ORDER BY created_at DESC
                LIMIT 100
            `,
            });

            /**
             * Moves a trade from any of `from` to `to`, and says whether it
             * happened. A `false` is not an error, it is the answer: somebody
             * else got there first.
             */
            const transition = (options: {
                readonly tradeId: string;
                readonly from: ReadonlyArray<TradeStateValue>;
                readonly to: TradeStateValue;
            }): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                    UPDATE trades SET state = ${options.to}, updated_at = NOW()
                    WHERE id = ${options.tradeId} AND ${sql.in("state", options.from)}
                    RETURNING id
                `,
                    (rows) => rows.length > 0
                );

            /**
             * Binds the counterparty and moves the trade on, in one guarded
             * statement, so two racing accepts of an open offer resolve in the
             * database: the winner gets the row back, the loser gets none.
             * Accepting your own offer is refused the same way.
             */
            const accept = SqlSchema.findOneOption({
                Request: Schema.Struct({
                    tradeId: uuid,
                    counterpartyUserId: uuid,
                    counterpartyPlayerId: PlayerIdSchema,
                }),
                Result: Trade,
                execute: (options) => sql`
                UPDATE trades
                SET counterparty_user_id = ${options.counterpartyUserId},
                    counterparty_player_id = ${options.counterpartyPlayerId},
                    state = CASE mechanism WHEN 'splice' THEN 'awaiting_confirmation' ELSE 'accepted' END,
                    updated_at = NOW()
                WHERE id = ${options.tradeId}
                  AND state = 'proposed'
                  AND expires_at > NOW()
                  AND proposer_user_id <> ${options.counterpartyUserId}
                  AND (counterparty_player_id IS NULL OR counterparty_player_id = ${options.counterpartyPlayerId})
                  AND (counterparty_user_id IS NULL OR counterparty_user_id = ${options.counterpartyUserId})
                RETURNING *
            `,
            });

            /**
             * Records one side's splice confirmation. `WHERE ... IS NULL` makes a
             * double click a no-op rather than a second consent, and the returned
             * row is how the caller learns whether both sides have now confirmed.
             */
            const confirmSplice = (options: {
                readonly tradeId: string;
                readonly role: "proposer" | "counterparty";
            }): Effect.Effect<Option.Option<Trade>, SqlError.SqlError | Schema.SchemaError, never> => {
                const confirm =
                    options.role === "proposer"
                        ? sql`
                        UPDATE trades SET proposer_confirmed_at = NOW(), updated_at = NOW()
                        WHERE id = ${options.tradeId} AND mechanism = 'splice'
                          AND state = 'awaiting_confirmation' AND proposer_confirmed_at IS NULL
                        RETURNING *
                    `
                        : sql`
                        UPDATE trades SET counterparty_confirmed_at = NOW(), updated_at = NOW()
                        WHERE id = ${options.tradeId} AND mechanism = 'splice'
                          AND state = 'awaiting_confirmation' AND counterparty_confirmed_at IS NULL
                        RETURNING *
                    `;
                return Effect.flatMap(confirm, (rows) =>
                    rows.length === 0
                        ? Effect.succeedNone
                        : Effect.map(Schema.decodeUnknownEffect(Trade)(rows[0]), Option.some)
                );
            };

            /**
             * Terminal failure with a reason a participant can read. Guarded so a
             * late failure report cannot overwrite a settlement.
             */
            const fail = (options: {
                readonly tradeId: string;
                readonly reason: string;
            }): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                    UPDATE trades SET state = 'failed', failure_reason = ${options.reason}, updated_at = NOW()
                    WHERE id = ${options.tradeId}
                      AND state NOT IN ('settled', 'cancelled', 'refunded', 'expired', 'failed')
                    RETURNING id
                `,
                    (rows) => rows.length > 0
                );

            /**
             * Expired trades something was already deposited into. These need a
             * refund saga, not a statement, which is why the pg_cron sweep leaves
             * them alone.
             */
            const dueForRefund = SqlSchema.findAll({
                Request: Schema.Int,
                Result: Trade,
                execute: (limit) => sql`
                SELECT * FROM trades
                WHERE expires_at < NOW()
                  AND state IN ('accepted', 'awaiting_confirmation', 'escrowing', 'escrowed')
                  AND EXISTS (
                      SELECT 1 FROM trade_legs
                      WHERE trade_legs.trade_id = trades.id AND trade_legs.state <> 'pending'
                  )
                LIMIT ${limit}
            `,
            });

            /**
             * The public counters. Counts only - the one query serving an
             * unauthenticated endpoint must have nothing per-user in it.
             */
            const stats = Effect.map(
                sql`
                SELECT
                    (SELECT COUNT(*) FROM trades WHERE state = 'settled') AS settled_trades,
                    (SELECT COUNT(DISTINCT trader) FROM (
                        SELECT proposer_user_id AS trader FROM trades
                        UNION
                        SELECT counterparty_user_id FROM trades WHERE counterparty_user_id IS NOT NULL
                    ) traders) AS active_traders,
                    (SELECT COUNT(*) FROM trade_legs WHERE state IN ('settled', 'refunded')) AS items_moved
            `,
                (rows) => ({
                    settledTrades: Number(rows[0]?.["settledTrades"] ?? 0),
                    activeTraders: Number(rows[0]?.["activeTraders"] ?? 0),
                    itemsMoved: Number(rows[0]?.["itemsMoved"] ?? 0),
                })
            );

            return { create, byId, listForUser, transition, accept, confirmSplice, fail, dueForRefund, stats };
        }),
    }
) {
    static readonly Default = Layer.effect(TradesRepository, TradesRepository.make);
}

/**
 * The treasury's api handlers.
 *
 * Every handler acts as the bearer token's subject and nobody else (who that
 * is, and whether the token may call the endpoint at all, is
 * `routes/access.ts`'s business), and the
 * participant checks all answer `404` rather than `403` for someone else's
 * trade: the api never confirms a trade exists to a stranger. The deeper
 * invariants - who may accept, what a cancel may interrupt - are not
 * enforced here but in the repositories' guarded transitions, so a future
 * caller cannot skip them by taking a different route in.
 *
 * Only tinyburg.app's own app may change a trade (`requireFirstParty`):
 * propose, accept, cancel and confirm answer `403` to any other application,
 * whatever `treasury` scopes it holds. A trade moves items on a trader's
 * tower with the grant the trader gave the treasury, not the caller, so a
 * third party that could propose and accept, or confirm a splice, would
 * wield `send_item` and `push_save` it was never given, and "both parties
 * confirm on the web app" would mean nothing. Cancelling moves nothing by
 * itself, but it ends a trade or starts a refund under a trade in escrow,
 * which is not a third party's call either. Reading stays open to any
 * application with the scope: the trades, the grant status, and a tower's
 * tradeable items, which the treasury reads with its own `pull_save` but
 * hands back only as the list `treasury:list_inventory` was consented for.
 */

import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";

import type { Trade } from "../domain/model.ts";
import type { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { Bitizens, TinyTower } from "@tinyburg/tinytower-sdk";
import { Api, ItemSpec } from "@tinyburg/treasury-sdk/Sdk";

import { GrantsRepository } from "../domain/grants.ts";
import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { FIRST_PARTY_CLIENT_ID, TinyburgProvider } from "../services/provider.ts";
import { TinyburgApi } from "../services/tinyburg.ts";
import { GiftEscrowWorkflow } from "../workflows/giftEscrow.ts";
import { RefundWorkflow } from "../workflows/refund.ts";
import { SpliceWorkflow } from "../workflows/splice.ts";
import { RequireAccessLive, requireTrader } from "./access.ts";

type PlayerId = typeof PlayerIdSchema.Type;

const decodeItemSpec = Schema.decodeEffect(Schema.fromJsonString(ItemSpec));
const encodeItemSpec = Schema.encodeEffect(Schema.fromJsonString(ItemSpec));
const decodeSave = Schema.decodeEffect(TinyTower.SaveData);
const encodeBitizen = Schema.encodeEffect(Bitizens.Bitizen);

const TreasuryGroupLive = HttpApiBuilder.group(
    Api,
    "TreasuryGroup",
    Effect.fnUntraced(function* (handlers) {
        const trades = yield* TradesRepository;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const grants = yield* GrantsRepository;
        const tinyburg = yield* TinyburgApi;
        const provider = yield* TinyburgProvider;

        const connectUrl = `${provider.publicUrl}/auth/connect?returnTo=${encodeURIComponent(`${provider.issuer}/trades`)}`;

        /**
         * The ownership gate: a player id not among the caller's linked
         * accounts is somebody trying to trade a tower that is not theirs. A
         * permanently dead grant reads as `403` - the connect flow is the
         * fix - while a provider blip reads as `503`.
         */
        const ownsPlayer = Effect.fnUntraced(function* (userId: string, playerId: PlayerId) {
            const linked = yield* tinyburg
                .listAccounts(userId)
                .pipe(
                    Effect.mapError((error) =>
                        error.permanent ? new HttpApiError.Forbidden() : new HttpApiError.ServiceUnavailable()
                    )
                );
            return linked.some((account) => account.playerId === playerId);
        });

        /** A trade as the api describes it, from one caller's point of view. */
        const encodeTrade = Effect.fnUntraced(function* (trade: Trade, userId: string) {
            const gives = yield* decodeItemSpec(trade.gives);
            const wants = yield* decodeItemSpec(trade.wants);
            const role =
                trade.proposerUserId === userId
                    ? ("proposer" as const)
                    : Option.getOrUndefined(trade.counterpartyUserId) === userId
                      ? ("counterparty" as const)
                      : undefined;
            return {
                id: trade.id,
                mechanism: trade.mechanism,
                game: trade.game,
                state: trade.state,
                proposerPlayerId: trade.proposerPlayerId,
                counterpartyPlayerId: Option.getOrUndefined(trade.counterpartyPlayerId),
                gives,
                wants,
                role,
                proposerConfirmedAt: Option.getOrUndefined(trade.proposerConfirmedAt),
                counterpartyConfirmedAt: Option.getOrUndefined(trade.counterpartyConfirmedAt),
                createdAt: trade.createdAt,
                expiresAt: trade.expiresAt,
                failureReason: Option.getOrUndefined(trade.failureReason),
            };
        }, Effect.orDie);

        /**
         * The trader, when the application calling is tinyburg.app's own;
         * `403` for any other. Every endpoint that changes a trade asks
         * this instead of `requireTrader`.
         */
        const requireFirstParty = Effect.gen(function* () {
            const trader = yield* requireTrader;
            if (trader.clientId !== FIRST_PARTY_CLIENT_ID) return yield* new HttpApiError.Forbidden();
            return trader;
        });

        const isParticipant = (trade: Trade, userId: string): boolean =>
            trade.proposerUserId === userId || Option.getOrUndefined(trade.counterpartyUserId) === userId;

        /** A participant's trade, or `404` - existence is not confirmed to strangers. */
        const participantTrade = Effect.fnUntraced(function* (tradeId: string, userId: string) {
            const trade = yield* Effect.orDie(trades.byId(tradeId));
            if (Option.isNone(trade) || !isParticipant(trade.value, userId)) {
                return yield* new HttpApiError.NotFound();
            }
            return trade.value;
        });

        return handlers
            .handle("GrantStatus", () =>
                Effect.gen(function* () {
                    const user = yield* requireTrader;
                    const grant = yield* Effect.orDie(grants.findLive(user.userId));
                    return {
                        connected: Option.isSome(grant),
                        scope: Option.map(grant, (live) => live.scope).pipe(Option.getOrUndefined),
                        connectUrl,
                    };
                })
            )

            .handle("ListTrades", () =>
                Effect.gen(function* () {
                    const user = yield* requireTrader;
                    const mine = yield* Effect.orDie(trades.listForUser(user.userId));
                    return yield* Effect.forEach(mine, (trade) => encodeTrade(trade, user.userId));
                })
            )

            .handle("GetTrade", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* requireTrader;
                    const trade = yield* participantTrade(params.tradeId, user.userId);
                    const tradeLegs = yield* Effect.orDie(legs.forTrade(trade.id));
                    const history = yield* Effect.orDie(ledger.forTrade(trade.id));
                    return {
                        trade: yield* encodeTrade(trade, user.userId),
                        legs: tradeLegs.map((leg) => ({
                            role: leg.role,
                            fromPlayerId: leg.fromPlayerId,
                            toPlayerId: leg.toPlayerId,
                            state: leg.state,
                            itemType: leg.itemType,
                            item: leg.itemStr,
                        })),
                        ledger: history.map((event) => ({ event: event.event, at: event.createdAt })),
                    };
                })
            )

            .handle("ProposeTrade", ({ payload }) =>
                Effect.gen(function* () {
                    const user = yield* requireFirstParty;

                    // The offer must match the mechanism: gift items ride the
                    // gift channel, splice lists ride the splice, never mixed.
                    const expectedTag = payload.mechanism === "gift" ? "GiftItem" : "SpliceItems";
                    if (payload.gives._tag !== expectedTag || payload.wants._tag !== expectedTag) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const owns = yield* ownsPlayer(user.userId, payload.proposerPlayerId);
                    if (!owns) return yield* new HttpApiError.Forbidden();

                    const now = yield* DateTime.now;
                    const trade = yield* trades
                        .create({
                            mechanism: payload.mechanism,
                            game: payload.game,
                            proposerUserId: user.userId,
                            proposerPlayerId: payload.proposerPlayerId,
                            counterpartyPlayerId: Option.fromUndefinedOr(payload.counterpartyPlayerId),
                            gives: yield* Effect.orDie(encodeItemSpec(payload.gives)),
                            wants: yield* Effect.orDie(encodeItemSpec(payload.wants)),
                            expiresAt: DateTime.addDuration(now, Duration.hours(payload.ttlHours)),
                        })
                        .pipe(Effect.orDie);
                    yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "proposed" }));
                    return yield* encodeTrade(trade, user.userId);
                })
            )

            .handle("AcceptTrade", ({ params, payload }) =>
                Effect.gen(function* () {
                    const user = yield* requireFirstParty;

                    const owns = yield* ownsPlayer(user.userId, payload.playerId);
                    if (!owns) return yield* new HttpApiError.Forbidden();

                    const accepted = yield* trades
                        .accept({
                            tradeId: params.tradeId,
                            counterpartyUserId: user.userId,
                            counterpartyPlayerId: payload.playerId,
                        })
                        .pipe(Effect.orDie);

                    if (Option.isNone(accepted)) {
                        // Not acceptable is Conflict; not visible is NotFound.
                        const existing = yield* Effect.orDie(trades.byId(params.tradeId));
                        if (Option.isNone(existing)) return yield* new HttpApiError.NotFound();
                        return yield* new HttpApiError.Conflict();
                    }

                    yield* Effect.ignore(ledger.append({ tradeId: params.tradeId, event: "accepted" }));

                    // The saga runs long after this response; a splice trade
                    // instead waits for both explicit confirmations.
                    if (accepted.value.mechanism === "gift") {
                        yield* GiftEscrowWorkflow.execute({ tradeId: params.tradeId }, { discard: true });
                    }

                    return yield* encodeTrade(accepted.value, user.userId);
                })
            )

            .handle("CancelTrade", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* requireFirstParty;
                    const trade = yield* participantTrade(params.tradeId, user.userId);

                    // Nothing has moved yet: the trade simply ends.
                    const cancelled = yield* trades
                        .transition({
                            tradeId: trade.id,
                            from: ["proposed", "accepted", "awaiting_confirmation"],
                            to: "cancelled",
                        })
                        .pipe(Effect.orDie);
                    if (cancelled) {
                        yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "cancelled" }));
                        const fresh = yield* participantTrade(trade.id, user.userId);
                        return yield* encodeTrade(fresh, user.userId);
                    }

                    // Deposits are in the vault: cancelling means unwinding.
                    if (trade.state === "escrowing" || trade.state === "escrowed") {
                        yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "cancel_requested" }));
                        yield* RefundWorkflow.execute({ tradeId: trade.id }, { discard: true });
                        const fresh = yield* participantTrade(trade.id, user.userId);
                        return yield* encodeTrade(fresh, user.userId);
                    }

                    return yield* new HttpApiError.Conflict();
                })
            )

            .handle("ConfirmSplice", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* requireFirstParty;
                    const trade = yield* participantTrade(params.tradeId, user.userId);
                    if (trade.mechanism !== "splice") return yield* new HttpApiError.Conflict();

                    const role =
                        trade.proposerUserId === user.userId ? ("proposer" as const) : ("counterparty" as const);
                    const alreadyConfirmed =
                        role === "proposer"
                            ? Option.isSome(trade.proposerConfirmedAt)
                            : Option.isSome(trade.counterpartyConfirmedAt);

                    const confirmed = yield* trades.confirmSplice({ tradeId: trade.id, role }).pipe(Effect.orDie);

                    // A double click on an already-given confirmation is a
                    // no-op, not a conflict; anything else refusing is.
                    if (Option.isNone(confirmed) && !(alreadyConfirmed && trade.state === "awaiting_confirmation")) {
                        return yield* new HttpApiError.Conflict();
                    }

                    yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: `splice_confirmed_${role}` }));

                    const fresh = yield* participantTrade(trade.id, user.userId);
                    if (Option.isSome(fresh.proposerConfirmedAt) && Option.isSome(fresh.counterpartyConfirmedAt)) {
                        yield* SpliceWorkflow.execute({ tradeId: trade.id }, { discard: true });
                    }
                    return yield* encodeTrade(fresh, user.userId);
                })
            )

            .handle("ListInventory", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* requireTrader;
                    const owns = yield* ownsPlayer(user.userId, params.playerId);
                    if (!owns) return yield* new HttpApiError.NotFound();

                    const save = yield* tinyburg
                        .pullSave({ tinyburgUserId: user.userId, playerId: params.playerId })
                        .pipe(Effect.mapError(() => new HttpApiError.ServiceUnavailable()));
                    const decoded = yield* decodeSave(save.data).pipe(
                        Effect.mapError(() => new HttpApiError.ServiceUnavailable())
                    );
                    const bitizens = yield* Effect.forEach(decoded.bzns, (bitizen) => encodeBitizen(bitizen)).pipe(
                        Effect.mapError(() => new HttpApiError.ServiceUnavailable())
                    );

                    return {
                        playerId: params.playerId,
                        bitizens,
                        costumes: decoded.costumes,
                        pets: decoded.pets ?? [],
                        coins: decoded.coins,
                        bux: decoded.bux,
                    };
                })
            );
    })
);

/**
 * The public counters, cached so an unauthenticated endpoint on the front
 * page cannot become a database hammer. A miss after the TTL recomputes;
 * everything in between serves the held value.
 */
const TreasuryPublicGroupLive = HttpApiBuilder.group(
    Api,
    "TreasuryPublicGroup",
    Effect.fnUntraced(function* (handlers) {
        const trades = yield* TradesRepository;
        const [cachedStats] = yield* Effect.orDie(trades.stats).pipe(Effect.cachedInvalidateWithTTL("1 minute"));
        return handlers.handle("Stats", () => cachedStats);
    })
);

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
    Layer.provide(TreasuryGroupLive),
    Layer.provide(TreasuryPublicGroupLive),
    Layer.provide(RequireAccessLive)
);

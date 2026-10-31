/**
 * The treasury's api handlers.
 *
 * Every handler acts as the bearer token's subject and nobody else, and the
 * participant checks all answer `404` rather than `403` for someone else's
 * trade: the api never confirms a trade exists to a stranger. The deeper
 * invariants - who may accept, what a cancel may interrupt - are not
 * enforced here but in the repositories' guarded transitions, so a future
 * caller cannot skip them by taking a different route in.
 */

import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import type { Trade } from "../domain/model.ts";
import type { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { Bitizens, TinyTower } from "@tinyburg/tinytower-sdk";
import { Api, ItemSpec } from "@tinyburg/treasury-sdk/Sdk";
import { ResourceServer } from "effect-oidc";

import { GrantsRepository } from "../domain/grants.ts";
import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { TinyburgOidc } from "../services/oidc.ts";
import { TinyburgTrading } from "../services/tinyburg.ts";
import { GiftEscrowWorkflow } from "../workflows/giftEscrow.ts";
import { RefundWorkflow } from "../workflows/refund.ts";
import { SpliceWorkflow } from "../workflows/splice.ts";

type PlayerId = typeof PlayerIdSchema.Type;

const decodeItemSpec = Schema.decodeEffect(Schema.fromJsonString(ItemSpec));
const encodeItemSpec = Schema.encodeEffect(Schema.fromJsonString(ItemSpec));
const decodeSave = Schema.decodeEffect(TinyTower.SaveData);
const encodeBitizen = Schema.encodeEffect(Bitizens.Bitizen);

/**
 * Verifying tokens is delegated to the provider's published keys: the
 * treasury holds none of its own, so a token minted anywhere but
 * tinyburg.app verifies nowhere here.
 */
const AuthorizationLive = Layer.unwrap(
    Effect.map(TinyburgOidc, (oidc) =>
        ResourceServer.layer({
            issuer: oidc.issuer,
            audience: oidc.issuer,
        })
    )
);

const TreasuryGroupLive = HttpApiBuilder.group(
    Api,
    "TreasuryGroup",
    Effect.fnUntraced(function* (handlers) {
        const trades = yield* TradesRepository;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const grants = yield* GrantsRepository;
        const tinyburg = yield* TinyburgTrading;
        const oidc = yield* TinyburgOidc;

        const connectUrl = `${oidc.publicUrl}/auth/connect?returnTo=${encodeURIComponent(`${oidc.issuer}/trades`)}`;

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
            const gives = yield* Effect.orDie(decodeItemSpec(trade.gives));
            const wants = yield* Effect.orDie(decodeItemSpec(trade.wants));
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
                    const user = yield* ResourceServer.CurrentUser;
                    const grant = yield* Effect.orDie(grants.findLive(user.sub));
                    return {
                        connected: Option.isSome(grant),
                        scope: Option.map(grant, (live) => live.scope).pipe(Option.getOrUndefined),
                        connectUrl,
                    };
                })
            )

            .handle("ListTrades", () =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;
                    const mine = yield* Effect.orDie(trades.listForUser(user.sub));
                    return yield* Effect.forEach(mine, (trade) => encodeTrade(trade, user.sub));
                })
            )

            .handle("GetTrade", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;
                    const trade = yield* participantTrade(params.tradeId, user.sub);
                    const tradeLegs = yield* Effect.orDie(legs.forTrade(trade.id));
                    const history = yield* Effect.orDie(ledger.forTrade(trade.id));
                    return {
                        trade: yield* encodeTrade(trade, user.sub),
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
                    const user = yield* ResourceServer.CurrentUser;

                    // The offer must match the mechanism: gift items ride the
                    // gift channel, splice lists ride the splice, never mixed.
                    const expectedTag = payload.mechanism === "gift" ? "GiftItem" : "SpliceItems";
                    if (payload.gives._tag !== expectedTag || payload.wants._tag !== expectedTag) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const owns = yield* ownsPlayer(user.sub, payload.proposerPlayerId);
                    if (!owns) return yield* new HttpApiError.Forbidden();

                    const now = yield* DateTime.now;
                    const trade = yield* trades
                        .create({
                            mechanism: payload.mechanism,
                            game: payload.game,
                            proposerUserId: user.sub,
                            proposerPlayerId: payload.proposerPlayerId,
                            counterpartyPlayerId: Option.fromUndefinedOr(payload.counterpartyPlayerId),
                            gives: yield* Effect.orDie(encodeItemSpec(payload.gives)),
                            wants: yield* Effect.orDie(encodeItemSpec(payload.wants)),
                            expiresAt: DateTime.addDuration(now, Duration.hours(payload.ttlHours)),
                        })
                        .pipe(Effect.orDie);
                    yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "proposed" }));
                    return yield* encodeTrade(trade, user.sub);
                })
            )

            .handle("AcceptTrade", ({ params, payload }) =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;

                    const owns = yield* ownsPlayer(user.sub, payload.playerId);
                    if (!owns) return yield* new HttpApiError.Forbidden();

                    const accepted = yield* trades
                        .accept({
                            tradeId: params.tradeId,
                            counterpartyUserId: user.sub,
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

                    return yield* encodeTrade(accepted.value, user.sub);
                })
            )

            .handle("CancelTrade", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;
                    const trade = yield* participantTrade(params.tradeId, user.sub);

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
                        const fresh = yield* participantTrade(trade.id, user.sub);
                        return yield* encodeTrade(fresh, user.sub);
                    }

                    // Deposits are in the vault: cancelling means unwinding.
                    if (trade.state === "escrowing" || trade.state === "escrowed") {
                        yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "cancel_requested" }));
                        yield* RefundWorkflow.execute({ tradeId: trade.id }, { discard: true });
                        const fresh = yield* participantTrade(trade.id, user.sub);
                        return yield* encodeTrade(fresh, user.sub);
                    }

                    return yield* new HttpApiError.Conflict();
                })
            )

            .handle("ConfirmSplice", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;
                    const trade = yield* participantTrade(params.tradeId, user.sub);
                    if (trade.mechanism !== "splice") return yield* new HttpApiError.Conflict();

                    const role = trade.proposerUserId === user.sub ? ("proposer" as const) : ("counterparty" as const);
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

                    const fresh = yield* participantTrade(trade.id, user.sub);
                    if (Option.isSome(fresh.proposerConfirmedAt) && Option.isSome(fresh.counterpartyConfirmedAt)) {
                        yield* SpliceWorkflow.execute({ tradeId: trade.id }, { discard: true });
                    }
                    return yield* encodeTrade(fresh, user.sub);
                })
            )

            .handle("ListInventory", ({ params }) =>
                Effect.gen(function* () {
                    const user = yield* ResourceServer.CurrentUser;
                    const owns = yield* ownsPlayer(user.sub, params.playerId);
                    if (!owns) return yield* new HttpApiError.NotFound();

                    const save = yield* tinyburg
                        .pullSave({ tinyburgUserId: user.sub, playerId: params.playerId })
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
    Layer.provide(AuthorizationLive)
);

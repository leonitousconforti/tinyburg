/**
 * The treasury's window onto traders' towers.
 *
 * The treasury never holds a player's Nimblebit key. It holds an OAuth grant
 * against tinyburg.app, and tinyburg.app (which does hold the key, and which
 * verified the player actually owns it) performs the call. Deposits into
 * escrow, save pulls and splice pushes all travel this road; only the vault's
 * own tower is reached any other way.
 *
 * The provider rotates refresh tokens and detects reuse, so a stored token is
 * good for exactly one exchange. Losing the replacement means losing the
 * grant, which is why the store-or-invalidate block below is not optional
 * bookkeeping: a failure to store the rotation marks the grant dead rather
 * than leaving it to trip family revocation on the next saga. For the same
 * reason two exchanges for one trader never run at once (an api request and
 * a saga acting for the same person would otherwise present the same token
 * twice), and the access token one exchange yields is reused until shortly
 * before it expires rather than spending the grant on every call.
 */

import { Clock, Context, Effect, Layer, Option, Redacted, Result, Schema, Semaphore } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { Api } from "@tinyburg/trading-sdk/Sdk";
import * as OAuth from "@yielded/oauth/OAuth";

import { seal, unseal } from "../crypto.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { TinyburgProvider } from "./provider.ts";
import { NimblebitPacer } from "./ratelimit.ts";

type PlayerId = typeof PlayerIdSchema.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

/**
 * The stored grant cannot currently be turned into an access token.
 *
 * @since 1.0.0
 * @category Errors
 */
export class TowerGrantUnusable extends Schema.Error<TowerGrantUnusable, { readonly brand: unique symbol }>(
    "@tinyburg/treasury/TowerGrantUnusable"
)({
    _tag: Schema.tag("TowerGrantUnusable"),
    tinyburgUserId: Schema.String,
    reason: Schema.String,
    /** Whether the grant is dead for good, as opposed to a transient outage. */
    permanent: Schema.Boolean,
}) {}

/**
 * A call on a trader's tower did not go through.
 *
 * @since 1.0.0
 * @category Errors
 */
export class TowerUnavailable extends Schema.Error<TowerUnavailable, { readonly brand: unique symbol }>(
    "@tinyburg/treasury/TowerUnavailable"
)({
    _tag: Schema.tag("TowerUnavailable"),
    playerId: PlayerIdSchema,
    reason: Schema.String,
}) {}

/** How long before its stated expiry a held access token stops being reused. */
const EXPIRY_MARGIN_MILLIS = 60_000;

/** An access token held between calls, tied to the grant it was minted from. */
interface HeldToken {
    readonly ciphertext: string;
    readonly accessToken: string;
    readonly expiresAtMillis: number;
}

export class TinyburgTrading extends Context.Service<TinyburgTrading>()("@tinyburg/treasury/services/TinyburgTrading", {
    make: Effect.gen(function* () {
        const provider = yield* TinyburgProvider;
        const grants = yield* GrantsRepository;
        const pacer = yield* NimblebitPacer;
        const httpClient = yield* HttpClient.HttpClient;

        // One process holds every exchange (the cluster is a single runner),
        // so an in-memory lock per trader is the whole of the coordination.
        const locks = new Map<string, Semaphore.Semaphore>();
        const lockFor = (tinyburgUserId: string): Semaphore.Semaphore => {
            const existing = locks.get(tinyburgUserId);
            if (existing !== undefined) return existing;
            const created = Semaphore.makeUnsafe(1);
            locks.set(tinyburgUserId, created);
            return created;
        };
        const held = new Map<string, HeldToken>();

        /**
         * Trades a stored refresh token for a short-lived access token, or
         * hands back the one the last exchange yielded while it is fresh.
         *
         * Only the provider refusing the grant itself (`invalid_grant`:
         * revoked, expired, or a spent token presented again) means the grant
         * is dead. Anything else is treated as transient, so a provider blip
         * does not fail every trade in flight.
         */
        const exchange = Effect.fnUntraced(function* (tinyburgUserId: string) {
            const grant = yield* grants.findLive(tinyburgUserId).pipe(Effect.catchCause(() => Effect.succeedNone));

            if (Option.isNone(grant)) {
                held.delete(tinyburgUserId);
                return yield* new TowerGrantUnusable({
                    tinyburgUserId,
                    reason: "no live treasury grant is stored for this user",
                    permanent: true,
                });
            }

            // A reconnect replaces the stored token, which is what retires an
            // access token held from the grant before it.
            const now = yield* Clock.currentTimeMillis;
            const current = held.get(tinyburgUserId);
            if (
                current !== undefined &&
                current.ciphertext === grant.value.refreshTokenCiphertext &&
                current.expiresAtMillis > now
            ) {
                return current.accessToken;
            }

            const refreshToken = yield* unseal(grant.value.refreshTokenCiphertext).pipe(
                Effect.mapError(
                    () =>
                        new TowerGrantUnusable({
                            tinyburgUserId,
                            reason: "stored grant could not be unsealed",
                            permanent: true,
                        })
                )
            );

            const spentCiphertext = grant.value.refreshTokenCiphertext;
            const token = yield* provider.client.refreshGrant({ refreshToken }).pipe(
                Effect.flatMap(OAuth.tokens),
                Effect.catch((error) =>
                    Effect.gen(function* () {
                        // The provider telling us this grant will never work
                        // again. Retrying it on a schedule would be pure noise.
                        const permanent = error._tag === "OAuthRejected";
                        if (permanent) {
                            held.delete(tinyburgUserId);
                            yield* Effect.ignore(grants.invalidate({ tinyburgUserId, ciphertext: spentCiphertext }));
                        }
                        return yield* new TowerGrantUnusable({
                            tinyburgUserId,
                            reason: permanent
                                ? "the provider refused the grant"
                                : `token endpoint unavailable: ${error._tag}`,
                            permanent,
                        });
                    })
                )
            );

            /**
             * The provider rotates: the token we just spent is now dead and
             * the response carries its replacement. If the store fails we are
             * in the worst spot available (the old token is spent, the new
             * one is only in memory), so the grant is marked invalid rather
             * than left to fail confusingly later. The user reconnects and
             * gets a fresh family. A store that does not take because the
             * trader reconnected meanwhile is no failure: their new grant
             * stands, and this token is simply not kept.
             */
            let ciphertext = spentCiphertext;
            if (token.refreshToken !== undefined) {
                const rotated = yield* seal(Redacted.value(token.refreshToken)).pipe(
                    Effect.flatMap((refreshTokenCiphertext) =>
                        Effect.map(
                            grants.rotate({
                                tinyburgUserId,
                                spentCiphertext,
                                refreshTokenCiphertext,
                                scope: token.scope ?? grant.value.scope,
                            }),
                            (took) => (took ? Option.some(refreshTokenCiphertext) : Option.none<string>())
                        )
                    ),
                    Effect.result
                );
                if (Result.isFailure(rotated)) {
                    yield* Effect.logError(
                        "could not store a rotated refresh token, invalidating grant",
                        rotated.failure
                    );
                    yield* Effect.ignore(grants.invalidate({ tinyburgUserId, ciphertext: spentCiphertext }));
                }
                const stored = Result.isSuccess(rotated) ? rotated.success : Option.none<string>();
                if (Option.isNone(stored)) {
                    held.delete(tinyburgUserId);
                    return Redacted.value(token.accessToken);
                }
                ciphertext = stored.value;
            }

            // tinyburg.app always states a lifetime; a token that came
            // without one is used once rather than trusted indefinitely.
            if (token.expiresIn === undefined) {
                held.delete(tinyburgUserId);
            } else {
                held.set(tinyburgUserId, {
                    ciphertext,
                    accessToken: Redacted.value(token.accessToken),
                    expiresAtMillis: now + token.expiresIn * 1000 - EXPIRY_MARGIN_MILLIS,
                });
            }

            return Redacted.value(token.accessToken);
        });

        const accessTokenFor = (tinyburgUserId: string) =>
            lockFor(tinyburgUserId).withPermits(1)(exchange(tinyburgUserId));

        /**
         * `makeWith` rather than `make` so the `HttpClient` captured when
         * this layer was built is the one used, keeping the dependency an
         * implementation detail of this service. A `401` means the held
         * token stopped working before its time (the grant was revoked at
         * tinyburg.app), so it is dropped and the next call exchanges again,
         * which is where a dead grant gets noticed.
         */
        const clientFor = (tinyburgUserId: string, accessToken: string) =>
            HttpApiClient.makeWith(Api, {
                baseUrl: provider.issuer,
                httpClient: httpClient.pipe(
                    HttpClient.mapRequest(HttpClientRequest.bearerToken(accessToken)),
                    HttpClient.tap((response) =>
                        Effect.sync(() => {
                            if (response.status === 401) held.delete(tinyburgUserId);
                        })
                    )
                ),
            });

        const actingFor = Effect.fnUntraced(function* (tinyburgUserId: string) {
            const accessToken = yield* accessTokenFor(tinyburgUserId);
            return yield* clientFor(tinyburgUserId, accessToken);
        });

        const unavailable = (playerId: PlayerId, what: string) => (cause: unknown) =>
            new TowerUnavailable({
                playerId,
                // Endpoint failures are not plain strings; interpolating them here is intentional.
                // oxlint-disable-next-line typescript/restrict-template-expressions
                reason: `${what} failed: ${cause}`,
            });

        /**
         * The TinyTower accounts a user has proven they own, which is the
         * ownership gate in front of every trade action: a player id not in
         * this list is somebody trying to trade a tower that is not theirs.
         */
        const listAccounts = Effect.fnUntraced(function* (tinyburgUserId: string) {
            const client = yield* actingFor(tinyburgUserId);
            return yield* client.TinyTowerAccountsGroup.ListAccounts().pipe(
                Effect.mapError(
                    (cause) =>
                        new TowerGrantUnusable({
                            tinyburgUserId,
                            // Endpoint failures are not plain strings; interpolating them here is intentional.
                            // oxlint-disable-next-line typescript/restrict-template-expressions
                            reason: `could not list linked accounts: ${cause}`,
                            permanent: false,
                        })
                )
            );
        });

        /** A deposit or a release on the player's behalf, through the pacer. */
        const sendItem = Effect.fnUntraced(function* (options: {
            readonly tinyburgUserId: string;
            readonly playerId: PlayerId;
            readonly friendId: PlayerId;
            readonly itemType: SyncItemTypeValue;
            readonly item: string;
        }) {
            const client = yield* actingFor(options.tinyburgUserId);
            yield* pacer.paced(
                client.TinyTowerGroup.SendItem({
                    params: { playerId: options.playerId, friendId: options.friendId },
                    payload: { itemType: options.itemType, item: options.item },
                }).pipe(Effect.mapError(unavailable(options.playerId, "send")))
            );
        });

        const pullSave = Effect.fnUntraced(function* (options: {
            readonly tinyburgUserId: string;
            readonly playerId: PlayerId;
        }) {
            const client = yield* actingFor(options.tinyburgUserId);
            return yield* pacer.paced(
                client.TinyTowerGroup.PullSave({ params: { playerId: options.playerId } }).pipe(
                    Effect.mapError(unavailable(options.playerId, "pull"))
                )
            );
        });

        const checkVersion = Effect.fnUntraced(function* (options: {
            readonly tinyburgUserId: string;
            readonly playerId: PlayerId;
        }) {
            const client = yield* actingFor(options.tinyburgUserId);
            const version = yield* pacer.paced(
                client.TinyTowerGroup.CheckVersion({ params: { playerId: options.playerId } }).pipe(
                    Effect.mapError(unavailable(options.playerId, "version check"))
                )
            );
            return version.saveId;
        });

        const pushSnapshot = Effect.fnUntraced(function* (options: {
            readonly tinyburgUserId: string;
            readonly playerId: PlayerId;
            readonly data: string;
        }) {
            const client = yield* actingFor(options.tinyburgUserId);
            yield* pacer.paced(
                client.TinyTowerGroup.PushSnapshot({
                    params: { playerId: options.playerId },
                    payload: { data: options.data },
                }).pipe(Effect.mapError(unavailable(options.playerId, "snapshot push")))
            );
        });

        const pushSave = Effect.fnUntraced(function* (options: {
            readonly tinyburgUserId: string;
            readonly playerId: PlayerId;
            readonly data: string;
        }) {
            const client = yield* actingFor(options.tinyburgUserId);
            yield* pacer.paced(
                client.TinyTowerGroup.PushSave({
                    params: { playerId: options.playerId },
                    payload: { data: options.data },
                }).pipe(Effect.mapError(unavailable(options.playerId, "save push")))
            );
        });

        return { accessTokenFor, listAccounts, sendItem, pullSave, checkVersion, pushSnapshot, pushSave };
    }),
}) {
    static readonly Default = Layer.effect(TinyburgTrading, TinyburgTrading.make);
}

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
 * than leaving it to trip family revocation on the next saga.
 */

import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { Api } from "@tinyburg/trading-sdk/Sdk";

import { seal, unseal } from "../crypto.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { TinyburgOidc } from "./oidc.ts";
import { NimblebitPacer } from "./ratelimit.ts";

type PlayerId = typeof PlayerIdSchema.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

/**
 * The stored grant cannot currently be turned into an access token.
 *
 * @since 1.0.0
 * @category Errors
 */
export class TowerGrantUnusable extends Schema.Error<TowerGrantUnusable>("@tinyburg/treasury/TowerGrantUnusable")({
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
export class TowerUnavailable extends Schema.Error<TowerUnavailable>("@tinyburg/treasury/TowerUnavailable")({
    _tag: Schema.tag("TowerUnavailable"),
    playerId: PlayerIdSchema,
    reason: Schema.String,
}) {}

const TokenResponse = Schema.Struct({
    access_token: Schema.String,
    expires_in: Schema.optional(Schema.Finite),
    scope: Schema.optional(Schema.String),
    refresh_token: Schema.optional(Schema.String),
});

export class TinyburgTrading extends Context.Service<TinyburgTrading>()("@tinyburg/treasury/services/TinyburgTrading", {
    make: Effect.gen(function* () {
        const oidc = yield* TinyburgOidc;
        const grants = yield* GrantsRepository;
        const pacer = yield* NimblebitPacer;
        const httpClient = yield* HttpClient.HttpClient;

        /**
         * Trades a stored refresh token for a short-lived access token.
         *
         * A 4xx from the token endpoint means the grant is dead (revoked
         * upstream, or superseded); anything else is treated as transient so
         * a provider blip does not fail every trade in flight.
         */
        const accessTokenFor = Effect.fnUntraced(function* (tinyburgUserId: string) {
            const grant = yield* grants
                .findLive(tinyburgUserId)
                .pipe(Effect.catchCause(() => Effect.succeed(Option.none())));

            if (Option.isNone(grant)) {
                return yield* new TowerGrantUnusable({
                    tinyburgUserId,
                    reason: "no live treasury grant is stored for this user",
                    permanent: true,
                });
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

            const body = new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: Redacted.value(refreshToken),
                client_id: oidc.clientId,
            });
            if (oidc.clientSecret !== undefined) {
                body.set("client_secret", oidc.clientSecret);
            }

            const response = yield* httpClient
                .execute(
                    HttpClientRequest.post(`${oidc.issuer}/oauth/token`).pipe(HttpClientRequest.bodyUrlParams(body))
                )
                .pipe(
                    Effect.mapError(
                        (cause) =>
                            new TowerGrantUnusable({
                                tinyburgUserId,
                                // Http client failures are not plain strings; interpolating them here is intentional.
                                // oxlint-disable-next-line typescript/restrict-template-expressions
                                reason: `token endpoint unreachable: ${cause}`,
                                permanent: false,
                            })
                    )
                );

            if (response.status >= 400) {
                // 4xx is the provider telling us this grant will never work
                // again. Retrying it on a schedule would be pure noise.
                const permanent = response.status < 500;
                if (permanent) {
                    yield* Effect.ignore(grants.invalidate(tinyburgUserId));
                }
                return yield* new TowerGrantUnusable({
                    tinyburgUserId,
                    reason: `token endpoint returned ${response.status}`,
                    permanent,
                });
            }

            const token = yield* response.json.pipe(
                Effect.flatMap(Schema.decodeUnknownEffect(TokenResponse)),
                Effect.mapError(
                    (cause) =>
                        new TowerGrantUnusable({
                            tinyburgUserId,
                            // Schema failures are not plain strings; interpolating them here is intentional.
                            // oxlint-disable-next-line typescript/restrict-template-expressions
                            reason: `unreadable token response: ${cause}`,
                            permanent: false,
                        })
                )
            );

            /**
             * The provider rotates: the token we just spent is now dead and
             * the response carries its replacement. If the store fails we are
             * in the worst spot available (the old token is spent, the new
             * one is only in memory), so the grant is marked invalid rather
             * than left to fail confusingly later. The user reconnects and
             * gets a fresh family.
             */
            if (token.refresh_token !== undefined) {
                yield* seal(token.refresh_token).pipe(
                    Effect.flatMap((ciphertext) =>
                        grants.upsert({
                            tinyburgUserId,
                            refreshTokenCiphertext: ciphertext,
                            scope: token.scope ?? grant.value.scope,
                        })
                    ),
                    Effect.catchCause((cause) =>
                        Effect.andThen(
                            Effect.logError("could not store a rotated refresh token, invalidating grant", cause),
                            Effect.ignore(grants.invalidate(tinyburgUserId))
                        )
                    )
                );
            }

            return token.access_token;
        });

        /**
         * `makeWith` rather than `make` so the `HttpClient` captured when
         * this layer was built is the one used, keeping the dependency an
         * implementation detail of this service.
         */
        const clientFor = (accessToken: string) =>
            HttpApiClient.makeWith(Api, {
                baseUrl: oidc.issuer,
                httpClient: HttpClient.mapRequest(httpClient, HttpClientRequest.bearerToken(accessToken)),
            });

        const actingFor = Effect.fnUntraced(function* (tinyburgUserId: string) {
            const accessToken = yield* accessTokenFor(tinyburgUserId);
            return yield* clientFor(accessToken);
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

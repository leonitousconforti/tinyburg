/**
 * The vault: the treasury's own tower, whose unreceived gift queue *is* the
 * escrow. Deposits arrive here as gifts and sit unclaimed; releasing a trade
 * forwards each item onward and only then claims the slot.
 *
 * The one invariant everything downstream leans on: a gift in the vault's
 * queue is never claimed outside a workflow. `social_receiveGift` removes
 * the gift from the queue whether or not it went anywhere, so claiming out
 * of order is how an item disappears.
 *
 * Unlike traders' towers, the vault is reached with its own credentials
 * rather than through the trading api - a treasury that had to OAuth-consent
 * to itself would be a circular bootstrap. The escrow ledger carries the
 * audit trail the trading api would otherwise have provided.
 */

import { Config, Context, Effect, Layer, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

import { NimblebitPacer } from "./ratelimit.ts";

type PlayerId = typeof NimblebitConfig.PlayerIdSchema.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

/**
 * The vault could not be reached or did not answer as expected. Always worth
 * retrying later: the gifts sit in Nimblebit's queue regardless.
 *
 * @since 1.0.0
 * @category Errors
 */
export class VaultUnavailable extends Schema.Error<VaultUnavailable>("@tinyburg/treasury/VaultUnavailable")({
    _tag: Schema.tag("VaultUnavailable"),
    reason: Schema.String,
}) {}

const vaultConfig = Config.all({
    playerId: Config.schema(NimblebitConfig.PlayerIdSchema, "VAULT_PLAYER_ID"),
    playerAuthKey: Config.schema(NimblebitConfig.PlayerAuthKeySchema, "VAULT_AUTH_KEY"),
});

/**
 * How the vault signs its calls. Talking to Nimblebit itself needs the
 * game's shared secret; anything else (the authproxy for its auditing, a
 * fake for the dev stack) is a custom host that does the real signing on its
 * side.
 */
export const VaultAuthLive = Layer.unwrap(
    Effect.map(Config.string("NIMBLEBIT_HOST").pipe(Config.withDefault("https://sync.nimblebit.com")), (host) =>
        host === "https://sync.nimblebit.com"
            ? NimblebitAuth.layerDirectConfig()
            : NimblebitAuth.layerCustomHostConfig({
                  host: Config.succeed(host),
                  authKey: Config.redacted("NIMBLEBIT_AUTH_KEY"),
              })
    )
);

export class Vault extends Context.Service<Vault>()("@tinyburg/treasury/services/Vault", {
    make: Effect.gen(function* () {
        const vault = yield* vaultConfig;
        const nimblebit = yield* NimblebitAuth.NimblebitAuth;
        const httpClient = yield* HttpClient.HttpClient;
        const pacer = yield* NimblebitPacer;

        const player = { playerId: vault.playerId, playerAuthKey: vault.playerAuthKey };

        const run = <A, E>(
            what: string,
            effect: Effect.Effect<A, E, NimblebitAuth.NimblebitAuth | HttpClient.HttpClient>
        ): Effect.Effect<A, VaultUnavailable> =>
            pacer.paced(
                effect.pipe(
                    Effect.provideService(NimblebitAuth.NimblebitAuth, nimblebit),
                    Effect.provideService(HttpClient.HttpClient, httpClient),
                    Effect.mapError(
                        (cause) =>
                            new VaultUnavailable({
                                // Sdk failures are not plain strings; interpolating them here is intentional.
                                // oxlint-disable-next-line typescript/restrict-template-expressions
                                reason: `${what} failed: ${cause}`,
                            })
                    )
                )
            );

        /** The vault's whole gift queue, unclaimed slots included - that is the point. */
        const listGifts = run("list gifts", TinyTower.social_getGifts(player));

        const sendItem = (options: {
            readonly friendId: PlayerId;
            readonly itemType: SyncItemTypeValue;
            readonly itemStr: string;
        }): Effect.Effect<void, VaultUnavailable> =>
            run("send", TinyTower.social_sendItem({ ...player, ...options })).pipe(Effect.asVoid);

        /** Clears a settled or refunded escrow slot. Only ever the last step of a leg. */
        const receiveGift = (giftId: number): Effect.Effect<void, VaultUnavailable> =>
            run("receive", TinyTower.social_receiveGift({ ...player, giftId })).pipe(Effect.asVoid);

        return { playerId: vault.playerId, listGifts, sendItem, receiveGift };
    }),
}) {
    static readonly Default = Layer.effect(Vault, Vault.make);
}

import { afterAll, describe, expect } from "@effect/vitest";

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Schema from "effect/Schema";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

const ConfigLayerLive = Layer.provide(PlatformConfigProvider.layerDotEnvAdd(".env"), NodeContext.layer);

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
).pipe(Layer.provide(ConfigLayerLive));

describe("SaveData schema round trip tests", async (it) => {
    const runtime = ManagedRuntime.make(Live);
    afterAll(() => runtime.dispose());

    const NimblebitFriendId = NimblebitConfig.PlayerIdSchema.make("1");
    const authenticatedPlayer = Effect.flatMap(NimblebitAuth.NimblebitAuth, (auth) => auth.burnbot);

    const snapshots = await runtime.runPromise(
        Effect.flatMap(authenticatedPlayer, (player) =>
            TinyTower.social_retrieveFriendsSnapshotList({
                ...player,
                friendId: NimblebitFriendId,
            })
        )
    );

    it.each(snapshots)(`snapshot $snapshotId from player ${NimblebitFriendId} created at $created`, ({ snapshotId }) =>
        Effect.gen(function* () {
            const player = yield* authenticatedPlayer;
            const { data: snapshotData } = yield* TinyTower.sync_pullSnapshot({
                snapshotId,
                ...player,
            });

            const decoded = yield* Schema.decode(TinyTower.SaveData)(snapshotData);
            const encoded = yield* Schema.encode(TinyTower.SaveData)(decoded);

            expect(snapshotData.startsWith('"') ? `"${encoded}"` : encoded).toStrictEqual(snapshotData);
        }).pipe(runtime.runPromise)
    );
});

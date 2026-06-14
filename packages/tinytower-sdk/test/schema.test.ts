import { ManagedRuntime, ConfigProvider, Effect, Layer, Path, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeServices } from "@effect/platform-node";
import { describe, it } from "@effect/vitest";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

const DotEnvLayer = Layer.effect(ConfigProvider.ConfigProvider, ConfigProvider.fromDotEnv({ path: ".env" }));
const ConfigLayerLive = DotEnvLayer.pipe(Layer.provideMerge(NodeServices.layer));

const Live = Layer.mergeAll(
    FetchHttpClient.layer,
    NimblebitAuth.layerDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
).pipe(Layer.provideMerge(ConfigLayerLive));

describe("SaveData schema round trip tests", async () => {
    const runtime = ManagedRuntime.make(Live);
    const NimblebitFriendId = NimblebitConfig.PlayerIdSchema.make("1");
    const authenticatedPlayer = Effect.flatMap(NimblebitAuth.NimblebitAuth, (auth) => auth.burnbot);

    const snapshots = await Effect.flatMap(authenticatedPlayer, (player) =>
        TinyTower.social_retrieveFriendsSnapshotList({
            friendId: NimblebitFriendId,
            ...player,
        })
    ).pipe(runtime.runPromise);

    it.for(snapshots)(
        `snapshot $snapshotId from player ${NimblebitFriendId} created at $created`,
        Effect.fnUntraced(
            function* ({ snapshotId }, { expect }) {
                expect.assertions(2);

                const player = yield* authenticatedPlayer;
                const { data: snapshotData } = yield* TinyTower.sync_pullSnapshot({
                    snapshotId,
                    ...player,
                });

                const decoded = yield* Schema.decodeEffect(TinyTower.SaveData)(snapshotData);
                const encoded = yield* Schema.encodeEffect(TinyTower.SaveData)(decoded);
                expect(snapshotData).toStrictEqual(snapshotData.startsWith('"') ? `"${encoded}"` : encoded);

                const snapshotPath = yield* Effect.flatMap(Path.Path, (path) =>
                    path.fromFileUrl(new URL(path.join("snapshots", snapshotId.toString()), import.meta.url))
                );

                yield* Effect.promise(() => expect(decoded).toMatchFileSnapshot(snapshotPath));
            },
            (effect) => runtime.runPromise(effect)
        )
    );
});

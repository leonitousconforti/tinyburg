import { assert, describe, expect, it } from "@effect/vitest";

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as Path from "@effect/platform/Path";
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";
import { ManagedRuntime } from "effect";

const ConfigLayerLive = Layer.provideMerge(PlatformConfigProvider.layerDotEnvAdd(".env"), NodeContext.layer);

const Live = Layer.mergeAll(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
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

    it.each(snapshots)(`snapshot $snapshotId from player ${NimblebitFriendId} created at $created`, ({ snapshotId }) =>
        Effect.gen(function* () {
            expect.assertions(1);

            const player = yield* authenticatedPlayer;
            const { data: snapshotData } = yield* TinyTower.sync_pullSnapshot({
                snapshotId,
                ...player,
            });

            const decoded = yield* Schema.decode(TinyTower.SaveData)(snapshotData);
            const encoded = yield* Schema.encode(TinyTower.SaveData)(decoded);

            assert.strictEqual(
                snapshotData,
                snapshotData.startsWith('"') ? `"${encoded}"` : encoded,
                "Encoded data does not match original snapshot data"
            );

            const snapshotPath = yield* Effect.flatMap(Path.Path, (path) =>
                path.fromFileUrl(new URL(path.join("snapshots", snapshotId.toString()), import.meta.url))
            );

            yield* Effect.promise(() => expect(decoded).toMatchFileSnapshot(snapshotPath));
        }).pipe(runtime.runPromise)
    );
});

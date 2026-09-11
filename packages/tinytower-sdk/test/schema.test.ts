import { ConfigProvider, Effect, Layer, ManagedRuntime, Path, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeServices } from "@effect/platform-node";
import { describe, it } from "@effect/vitest";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

const DotEnvLayer = Path.Path.pipe(
    Effect.flatMap((path) => path.fromFileUrl(new URL("../../../.env", import.meta.url))),
    Effect.flatMap((path) => ConfigProvider.fromDotEnv({ path })),
    ConfigProvider.layer
);

const ConfigLayerLive = DotEnvLayer.pipe(Layer.provideMerge(NodeServices.layer));

const Live = Layer.mergeAll(
    FetchHttpClient.layer,
    NimblebitAuth.layerDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
).pipe(Layer.provideMerge(ConfigLayerLive));

const runtime = ManagedRuntime.make(Live);

/*
  Resolved before the suite is described, because the list of snapshots is what
  the cases are generated from. Without a key there is nothing to enumerate, so
  the suite is skipped rather than reported as failing: no credentials is not
  the same answer as a broken round trip.
*/
const configured = await NimblebitConfig.NimblebitAuthKeyConfig.pipe(
    Effect.provide(ConfigLayerLive),
    Effect.as(true),
    // `catchCause` rather than `isSuccess`: an absent key surfaces as a schema
    // decode defect, not as a typed failure.
    Effect.catchCause(() => Effect.succeed(false)),
    Effect.runPromise
);

const NimblebitFriendId = NimblebitConfig.PlayerIdSchema.make("1");
const authenticatedPlayer = Effect.flatMap(NimblebitAuth.NimblebitAuth, (auth) => auth.burnbot("tinytower"));

const snapshots = configured
    ? await Effect.flatMap(authenticatedPlayer, (player) =>
          TinyTower.social_retrieveFriendsSnapshotList({
              friendId: NimblebitFriendId,
              ...player,
          })
      ).pipe(runtime.runPromise)
    : [];

describe.skipIf(!configured)("SaveData schema round trip tests", () => {
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

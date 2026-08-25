import { Config, ConfigProvider, Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";

const ConfigProviderLive = ConfigProvider.fromEnv().pipe(ConfigProvider.nested("DOORMANCLONE"), ConfigProvider.layer);

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerTinyburgAuthProxyConfig({
        authKey: Config.redacted("AUTHPROXY_AUTH_KEY"),
    })
).pipe(Layer.provideMerge(ConfigProviderLive), Layer.provide(NodeServices.layer));

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;

    const { total, visits } = yield* TinyTower.social_getVisits(authenticatedPlayer);
    yield* Effect.logInfo(`Have ${total} visits waiting`);

    for (const visit of visits) {
        const bitizen = yield* Schema.decodeEffect(Bitizens.Bitizen)(visit.contents);
        const encodedBitizen = yield* Schema.encodeEffect(Bitizens.Bitizen)(bitizen);

        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: visit.from,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${encodedBitizen}`,
        });

        yield* TinyTower.social_receiveGift({
            ...authenticatedPlayer,
            giftId: visit.id,
        });
    }
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

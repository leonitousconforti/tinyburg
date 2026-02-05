import { FetchHttpClient, HttpClient } from "@effect/platform";
import { NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";
import { Config, Effect, Layer, Redacted } from "effect";

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeTinyburgAuthProxyConfig({
        authKey: Config.redacted("AUTH_KEY"),
    })
);

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;
    const { visits } = yield* TinyTower.social_getVisits(authenticatedPlayer);

    for (const visit of visits) {
        console.log(visit);
        continue;

        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: visit.from,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${visit.contents}`,
        });

        yield* TinyTower.social_receiveGift({
            ...authenticatedPlayer,
            giftId: visit.id,
        });
    }

    // Heartbeat for monitoring
    const heartbeatUrl = yield* Config.redacted("HEARTBEAT_URL");
    yield* HttpClient.get(Redacted.value(heartbeatUrl));
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

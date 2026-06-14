import { Config, Effect, Layer, Redacted } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerTinyburgAuthProxyConfig({
        authKey: Config.redacted("AUTH_KEY"),
    })
).pipe(Layer.provide(NodeServices.layer));

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;
    const { visits } = yield* TinyTower.social_getVisits(authenticatedPlayer);

    for (const visit of visits) {
        yield* Effect.log(visit);

        // yield* TinyTower.social_sendItem({
        //     ...authenticatedPlayer,
        //     friendId: visit.from,
        //     itemType: SyncItemType.SyncItemType.Play,
        //     itemStr: `bit:${visit.contents}`,
        // });

        // yield* TinyTower.social_receiveGift({
        //     ...authenticatedPlayer,
        //     giftId: visit.id,
        // });
    }

    // Heartbeat for monitoring
    const heartbeatUrl = yield* Config.redacted("HEARTBEAT_URL");
    yield* HttpClient.get(Redacted.value(heartbeatUrl));
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

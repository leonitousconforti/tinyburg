import { Array, Config, ConfigProvider, Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/http";

import { NodeCrypto, NodeRuntime, NodeServices } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";

const ConfigProviderLive = ConfigProvider.fromEnv().pipe(ConfigProvider.nested("AUTOGOLDBITS"), ConfigProvider.layer);

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerTinyburgAuthProxyConfig({
        authKey: Config.Redacted("AUTHPROXY_AUTH_KEY"),
    })
).pipe(Layer.provideMerge(ConfigProviderLive), Layer.provide([NodeServices.layer, NodeCrypto.layerSecureRandom]));

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;

    // Get all the gifts sent to us
    const gifts = yield* TinyTower.social_getGifts(authenticatedPlayer);
    const bitizenGifts = Array.filter(gifts.gifts, (gift) => gift.type === SyncItemType.SyncItemType.Play);
    yield* Effect.logInfo(`Have ${gifts.total} gifts waiting, ${bitizenGifts.length} of which are bitizens to upgrade`);

    // For every bitizen gift...
    for (const bitizenGift of bitizenGifts) {
        const bitizen = yield* Schema.decodeEffect(Bitizens.Bitizen)(bitizenGift.contents);
        const friendMeta = yield* TinyTower.social_pullFriendMeta({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
        });

        // Upgrade their skills to 9s, and if they have a requested floor, set
        // their dream job to that floor
        const upgraded: typeof bitizen = {
            ...bitizen,
            attributes: {
                ...bitizen.attributes,
                skills: { ...bitizen.attributes.skills, creative: 9, food: 9, recreation: 9, retail: 9, service: 9 },
            },
            dreamJobIndex: friendMeta.requestedFloorId === -1 ? bitizen.dreamJobIndex : friendMeta.requestedFloorId,
        };

        // Send the upgraded bitizen back to the friend
        const encodedBitizen = yield* Schema.encodeEffect(Bitizens.Bitizen)(upgraded);
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${encodedBitizen}`,
        });

        // Finally, mark the gift as received so Nimblebit doesn't think we still have it
        yield* TinyTower.social_receiveGift({ ...authenticatedPlayer, giftId: bitizenGift.id });
    }
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

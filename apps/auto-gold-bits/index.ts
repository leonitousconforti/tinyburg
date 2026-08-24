// oxlint-disable typescript/no-unsafe-type-assertion

import { Array, Config, ConfigProvider, Effect, Layer, Schema, type Types } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("AUTOGOLDBITS"));
const ConfigLive = ConfigProvider.nested(ConfigProvider.fromEnv(), "AUTOGOLDBITS");

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerTinyburgAuthProxyConfig({
        authKey: Config.redacted("AUTHPROXY_AUTH_KEY"),
    })
).pipe(
    Layer.provideMerge(ConfigProvider.layer(ConfigLive)),
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provide(NodeServices.layer)
);

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;

    // Get all the gifts sent to us
    const gifts = yield* TinyTower.social_getGifts(authenticatedPlayer);
    const bitizenGifts = Array.filter(gifts.gifts, (gift) => gift.type === SyncItemType.SyncItemType.Play);
    yield* Effect.logInfo(`Have ${gifts.total} gifts waiting, ${bitizenGifts.length} of which are bitizens to upgrade`);

    // For every bitizen gift...
    for (const bitizenGift of bitizenGifts) {
        // Upgrade their skills to 9s
        const bitizen = yield* Schema.decodeEffect(Bitizens.Bitizen)(bitizenGift.contents);
        const mutableBitizen = bitizen as Types.DeepMutable<typeof bitizen>;
        mutableBitizen.attributes.skills.creative = 9;
        mutableBitizen.attributes.skills.food = 9;
        mutableBitizen.attributes.skills.recreation = 9;
        mutableBitizen.attributes.skills.retail = 9;
        mutableBitizen.attributes.skills.service = 9;

        // If they have a requested floor, set their dream job to that floor
        const friendMeta = yield* TinyTower.social_pullFriendMeta({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
        });

        if (friendMeta.requestedFloorId !== -1) {
            mutableBitizen.dreamJobIndex = friendMeta.requestedFloorId;
        }

        // Send the upgraded bitizen back to the friend
        const encodedBitizen = yield* Schema.encodeEffect(Bitizens.Bitizen)(mutableBitizen);
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

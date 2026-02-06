import { FetchHttpClient, HttpClient } from "@effect/platform";
import { NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";
import { Array, Config, Effect, Layer, Redacted, Schema, type Types } from "effect";

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeTinyburgAuthProxyConfig({
        authKey: Config.redacted("AUTH_KEY"),
    })
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
        const bitizen = yield* Schema.decode(Bitizens.Bitizen)(bitizenGift.contents);
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
        const encodedBitizen = yield* Schema.encode(Bitizens.Bitizen)(mutableBitizen);
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${encodedBitizen}`,
        });

        // Finally, mark the gift as received so Nimblebit doesn't think we still have it
        yield* TinyTower.social_receiveGift({ ...authenticatedPlayer, giftId: bitizenGift.id });
    }

    // Heartbeat for monitoring
    const heartbeatUrl = yield* Config.redacted("HEARTBEAT_URL");
    yield* HttpClient.get(Redacted.value(heartbeatUrl));
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

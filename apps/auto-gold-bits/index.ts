import { FetchHttpClient, PlatformConfigProvider } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig, NimblebitSchema, TinyTower } from "@tinyburg/tinytower-sdk";
import { Array, Effect, Layer, Schema, type Types } from "effect";

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
)
    .pipe(Layer.provide(PlatformConfigProvider.layerDotEnvAdd(".env")))
    .pipe(Layer.provideMerge(NodeContext.layer));

const program = Effect.gen(function* () {
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;

    // Get all the gifts sent to us
    const gifts = yield* TinyTower.social_getGifts(authenticatedPlayer);
    const bitizenGifts = Array.filter(gifts.gifts, (gift) => gift.type === NimblebitSchema.SyncItemType.enums.Play);
    yield* Effect.logInfo(`Have ${gifts.total} gifts waiting, ${bitizenGifts.length} of which are bitizens to upgrade`);

    // For every bitizen gift...
    for (const bitizenGift of bitizenGifts) {
        // Upgrade their skills to 9s
        const bitizen = yield* Schema.decode(NimblebitSchema.Bitizen)(bitizenGift.contents);
        (bitizen.attributes as Types.Mutable<typeof bitizen.attributes>).skillCreative = 9;
        (bitizen.attributes as Types.Mutable<typeof bitizen.attributes>).skillFood = 9;
        (bitizen.attributes as Types.Mutable<typeof bitizen.attributes>).skillRecreation = 9;
        (bitizen.attributes as Types.Mutable<typeof bitizen.attributes>).skillRetail = 9;
        (bitizen.attributes as Types.Mutable<typeof bitizen.attributes>).skillService = 9;

        // If they have a requested floor, set their dream job to that floor
        const friendMeta = yield* TinyTower.social_pullFriendMeta({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
        });

        if (friendMeta.requestedFloorId !== -1) {
            (bitizen as Types.Mutable<typeof bitizen>).dreamJobIndex = friendMeta.requestedFloorId;
        }

        // Send the upgraded bitizen back to the friend
        const encodedBitizen = yield* Schema.encode(NimblebitSchema.Bitizen)(bitizen);
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
            itemType: NimblebitSchema.SyncItemType.enums.Play,
            itemStr: encodedBitizen,
        });

        // Finally, mark the gift as received so Nimblebit doesn't think we still have it
        yield* TinyTower.social_receiveGift({ ...authenticatedPlayer, giftId: bitizenGift.id });
    }
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

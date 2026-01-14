import { FetchHttpClient, PlatformConfigProvider } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";
import { Array, Effect, Layer, Schema, type Types } from "effect";

const Live = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)
)
    .pipe(Layer.provide(PlatformConfigProvider.layerDotEnvAdd(".env")))
    .pipe(Layer.provide(NodeContext.layer));

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
        const skills = bitizen.attributes.skills as Types.Mutable<typeof bitizen.attributes.skills>;
        skills.creative = 9;
        skills.food = 9;
        skills.recreation = 9;
        skills.retail = 9;
        skills.service = 9;

        // If they have a requested floor, set their dream job to that floor
        const friendMeta = yield* TinyTower.social_pullFriendMeta({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
        });

        if (friendMeta.requestedFloorId !== -1) {
            (bitizen as Types.Mutable<typeof bitizen>).dreamJobIndex = friendMeta.requestedFloorId;
        }

        // Send the upgraded bitizen back to the friend
        const encodedBitizen = yield* Schema.encode(Bitizens.Bitizen)(bitizen);
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            friendId: bitizenGift.from,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: encodedBitizen,
        });

        // Finally, mark the gift as received so Nimblebit doesn't think we still have it
        yield* TinyTower.social_receiveGift({ ...authenticatedPlayer, giftId: bitizenGift.id });
    }
});

program.pipe(Effect.provide(Live), NodeRuntime.runMain);

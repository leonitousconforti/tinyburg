import { Prompt } from "@effect/cli";
import { FetchHttpClient, FileSystem, PlatformConfigProvider } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig, NimblebitSchema } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";
import { Config, Effect, Layer, Option, Schema } from "effect";

const BitizenAccessoriesJson = Schema.Struct({
    tie: Schema.Either({
        left: Schema.typeSchema(NimblebitSchema.UnityColor),
        right: Schema.typeSchema(NimblebitSchema.UnityColor),
    }),
    earrings: Schema.Either({
        left: Schema.typeSchema(NimblebitSchema.UnityColor),
        right: Schema.typeSchema(NimblebitSchema.UnityColor),
    }),
    glasses: Schema.Either({
        left: Schema.NonNegativeInt,
        right: Schema.NonNegativeInt,
    }),
    hairAccessory: Schema.Either({
        left: Schema.NonNegativeInt,
        right: Schema.NonNegativeInt,
    }),
    hat: Schema.Either({
        left: Schema.Struct({
            index: Schema.NonNegativeInt,
            color: Schema.typeSchema(NimblebitSchema.UnityColor),
        }),
        right: Schema.Struct({
            index: Schema.NonNegativeInt,
            gender: Schema.Literal("female", "male", "bi"),
            color: Schema.typeSchema(NimblebitSchema.UnityColor),
        }),
    }),
});

const BitizenAttributesJson = Bitizens.BitizenAttributes.pipe(
    Schema.typeSchema,
    Schema.omit("accessories"),
    Schema.extend(
        Schema.Struct({
            accessories: BitizenAccessoriesJson,
        })
    )
);

const BitizenJson = Bitizens.Bitizen.pipe(
    Schema.typeSchema,
    Schema.omit("attributes"),
    Schema.extend(
        Schema.Struct({
            attributes: BitizenAttributesJson,
        })
    )
);

const EnvLive = Layer.provideMerge(PlatformConfigProvider.layerDotEnvAdd(".env"), NodeContext.layer);

const AppLive = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeTinyburgAuthProxyConfig({
        authKey: Config.redacted("API_KEY"),
    })
).pipe(Layer.provideMerge(EnvLive));

const program = Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;
    const { gifts } = yield* TinyTower.social_getGifts(authenticatedPlayer);

    for (const gift of gifts) {
        // Prompt the user to decide whether to edit the gift
        const shouldEdit = yield* Prompt.toggle({
            message: `Would you like to edit gift ${gift.id}/${gift.type} from ${gift.from}?`,
            active: "yes",
            inactive: "no",
        }).pipe(Prompt.run);

        // Go to the next gift
        if (!shouldEdit) {
            continue;
        }

        // Try to decode the gift contents as a bitizen
        const maybeBitizen = Schema.decodeOption(Bitizens.Bitizen)(gift.contents);
        if (Option.isNone(maybeBitizen)) {
            yield* Effect.log(`Skipping because gift contents could not be decoded as a bitizen (${gift.contents})`);
            continue;
        }

        // Save the bitizen to the filesystem
        const bitizenJson = Schema.encodeSync(Schema.parseJson(BitizenJson, { space: 4 }))(maybeBitizen.value);
        yield* fileSystem.writeFileString(`gift_${gift.id}.json`, bitizenJson);

        // Wait for the user to confirm they are done editing
        let doneEditing = false;
        while (!doneEditing) {
            doneEditing = yield* Prompt.confirm({
                message: "Please confirm when you are done editing the gift and ready to send it back.",
            }).pipe(Prompt.run);
        }

        // Read the edited bitizen from the filesystem
        const editedJson = yield* fileSystem.readFileString(`gift_${gift.id}.json`);
        const editedBitizen = yield* Schema.decode(Schema.parseJson(BitizenJson))(editedJson);
        const bitizenEncoded = Schema.encodeSync(Bitizens.Bitizen)(editedBitizen);

        // Prompt who they want to send the edited bitizen to
        const friendId = yield* Prompt.text({
            message: "Enter the friend ID of whom you would like to send the gift back to",
            default: gift.from,
        }).pipe(Prompt.run, Effect.flatMap(Schema.decode(NimblebitConfig.PlayerIdSchema)));

        // Send the edited bitizen back as a play item
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${bitizenEncoded}`,
            friendId,
        });

        // Prompt the user to decide whether to mark the gift as received
        const shouldMarkReceived = yield* Prompt.toggle({
            message: `Would you like to mark gift ${gift.id} as received?`,
            active: "yes",
            inactive: "no",
        }).pipe(Prompt.run);

        if (!shouldMarkReceived) {
            continue;
        }

        // Mark the gift as received
        yield* TinyTower.social_receiveGift({
            ...authenticatedPlayer,
            giftId: gift.id,
        });

        // Delete the json file
        yield* fileSystem.remove(`gift_${gift.id}.json`);
    }
});

program.pipe(Effect.provide(AppLive), NodeRuntime.runMain);

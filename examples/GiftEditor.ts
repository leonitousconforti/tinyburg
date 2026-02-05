import { Prompt } from "@effect/cli";
import { FetchHttpClient, FileSystem, PlatformConfigProvider, Terminal } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Bitizens, SyncItemType, TinyTower } from "@tinyburg/tinytower-sdk";
import { Config, Console, Effect, Layer, Option, Schema, SchemaAST } from "effect";

class BitizenJson extends Schema.suspend(() => {
    const attributesJson = Schema.make<unknown, unknown, never>(
        new SchemaAST.Suspend(() => {
            const attributesSuspendAst = Bitizens.BitizenAttributes.ast;
            if (!SchemaAST.isSuspend(attributesSuspendAst)) {
                throw new Error("Expected BitizenAttributes to be suspended");
            }

            const attributesTransformAst = attributesSuspendAst.f();
            if (!SchemaAST.isTransformation(attributesTransformAst)) {
                throw new Error("Expected BitizenAttributes suspend to return a transformation");
            }

            return attributesTransformAst.to;
        })
    );

    return Bitizens.Bitizen.pipe(
        Schema.typeSchema,
        Schema.omit("attributes"),
        Schema.extend(Schema.Struct({ attributes: attributesJson }))
    );
}) {}

const EnvLive = Layer.provideMerge(PlatformConfigProvider.layerDotEnvAdd(".env"), NodeContext.layer);

const AppLive = Layer.merge(
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeTinyburgAuthProxyConfig({
        authKey: Config.redacted("API_KEY"),
    })
).pipe(Layer.provideMerge(EnvLive));

Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const authenticatedPlayer = yield* NimblebitConfig.AuthenticatedPlayerConfig;
    const { gifts } = yield* TinyTower.social_getGifts(authenticatedPlayer);

    for (const gift of gifts) {
        // Prompt the user to decide whether to edit the gift
        const shouldEdit = yield* Prompt.toggle({
            message: `Would you like to edit gift ${gift.id}/${gift.type} from ${gift.from}?`,
            active: "yes",
            inactive: "no",
        });

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
            });
        }

        // Read the edited bitizen from the filesystem
        const editedJson = yield* fileSystem.readFileString(`gift_${gift.id}.json`);
        const editedBitizen = yield* Schema.decode(Schema.parseJson(BitizenJson))(editedJson);
        const bitizenEncoded = yield* Schema.encodeUnknown(Bitizens.Bitizen)(editedBitizen);

        // Prompt who they want to send the edited bitizen to
        const decodeFriendId = Schema.decode(NimblebitConfig.PlayerIdSchema);
        const friendId = yield* Prompt.text({
            default: gift.from,
            message: "Enter the friend ID of whom you would like to send the gift back to",
            validate: (input) => Effect.mapError(decodeFriendId(input), () => "Invalid player id"),
        }).pipe(Effect.flatMap(decodeFriendId));

        // Prompt how many copies they want to send
        const count = yield* Prompt.integer({
            message: "How many copies of this bitizen would you like to send?",
            min: 1,
        });

        // Send the edited bitizen back as a play item
        yield* TinyTower.social_sendItem({
            ...authenticatedPlayer,
            itemType: SyncItemType.SyncItemType.Play,
            itemStr: `bit:${bitizenEncoded}`,
            friendId,
        }).pipe(Effect.repeatN(count - 1));

        // Prompt the user to decide whether to mark the gift as received
        const shouldMarkReceived = yield* Prompt.toggle({
            message: `Would you like to mark gift ${gift.id} as received?`,
            active: "yes",
            inactive: "no",
        });

        // Go to the next gift
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
}).pipe(
    Effect.catchIf(
        (error) => Terminal.isQuitException(error),
        () => Effect.andThen(Console.log(""), Effect.logInfo("Okay, goodbye!"))
    ),
    Effect.provide(AppLive),
    NodeRuntime.runMain
);

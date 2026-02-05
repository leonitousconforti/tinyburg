import { Prompt } from "@effect/cli";
import { FetchHttpClient, Terminal } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";
import { Config, Console, Effect, Layer, Redacted, Schema } from "effect";

const AppLive = Layer.mergeAll(
    NodeContext.layer,
    FetchHttpClient.layer,
    NimblebitAuth.layerNodeTinyburgAuthProxyConfig({
        authKey: Config.redacted("API_KEY"),
    })
);

Effect.gen(function* () {
    const playerId = yield* Prompt.text({
        message: "Enter your cloud sync id (a.k.a friend code)",
        validate: (input) =>
            Effect.mapError(
                Schema.decode(NimblebitConfig.PlayerIdSchema)(input),
                () => "Invalid player id, please look in the cloud sync menu"
            ),
    }).pipe(Effect.map(NimblebitConfig.PlayerIdSchema.make));

    const playerEmail = yield* Prompt.password({
        message: "Enter your email associated with this account",
    }).pipe(Effect.map(NimblebitConfig.PlayerEmailSchema.make));

    const result = yield* TinyTower.device_registerEmail({ playerId, playerEmail });
    yield* Effect.logInfo(result);

    const verificationCode = yield* Prompt.text({
        message: "Enter the verification code sent to your email",
    });

    const playerDetails = yield* TinyTower.device_verifyDevice({ verificationCode });
    const shouldPrint = yield* Prompt.confirm({
        message: "Do you want to print your player details? (this will contain sensitive information)",
    });

    if (!shouldPrint) {
        yield* Effect.logInfo("Understood, player details not printed.");
        return;
    }

    yield* Effect.logInfo(`playerId ${playerDetails.playerId}`);
    yield* Effect.logInfo(`playerEmail ${Redacted.value(playerDetails.playerEmail)}`);
    yield* Effect.logInfo(`playerAuthKey ${Redacted.value(playerDetails.playerAuthKey)}`);
}).pipe(
    Effect.catchIf(
        (error) => Terminal.isQuitException(error),
        () => Effect.andThen(Console.log(""), Effect.logInfo("Okay, goodbye!"))
    ),
    Effect.provide(AppLive),
    NodeRuntime.runMain
);

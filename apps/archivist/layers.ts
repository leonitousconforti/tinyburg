import { Config, ConfigProvider, Effect, Layer, Redacted, References } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { S3 } from "@effect-aws/client-s3";
import { NodeServices } from "@effect/platform-node";
import { AndroidDevice, PlayAccount } from "@efffrida/gplayapi";

const DoSpacesLive = Layer.unwrap(
    Effect.gen(function* () {
        const accessKeyId = yield* Config.redacted("SPACES_KEY");
        const secretAccessKey = yield* Config.redacted("SPACES_SECRET");
        return S3.layer({
            forcePathStyle: false,
            endpoint: "https://sfo3.digitaloceanspaces.com",
            region: "us-east-1",
            credentials: {
                accessKeyId: Redacted.value(accessKeyId),
                secretAccessKey: Redacted.value(secretAccessKey),
            },
        });
    })
);

export const Live = Layer.mergeAll(
    DoSpacesLive,
    AndroidDevice.EmbeddedPixel7aLive,
    PlayAccount.layerConfig(),
    Layer.succeed(References.MinimumLogLevel, "Debug")
).pipe(
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provideMerge(NodeServices.layer)
);

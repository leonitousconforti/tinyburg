import { S3 } from "@effect-aws/client-s3";
import { PlatformConfigProvider } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";
import { Config, Effect, Layer, Logger, LogLevel, Redacted } from "effect";

const DoSpacesLive = Layer.unwrapEffect(
    Effect.gen(function* () {
        const accessKeyId = yield* Config.redacted(Config.string("SPACES_KEY"));
        const secretAccessKey = yield* Config.redacted(Config.string("SPACES_SECRET"));
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
    GooglePlayApi.defaultHttpClient,
    Logger.minimumLogLevel(LogLevel.Debug)
).pipe(Layer.provideMerge(PlatformConfigProvider.layerDotEnvAdd(".env")), Layer.provideMerge(NodeContext.layer));

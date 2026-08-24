import { Config, ConfigProvider, Duration, Effect, Layer, Redacted, References } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { RateLimiter } from "effect/unstable/persistence";

import { S3 } from "@effect-aws/client-s3";
import { NodeServices } from "@effect/platform-node";
import { AndroidDevice, PlayAccount } from "@efffrida/gplayapi";

const ObjectStorageLive = Layer.unwrap(
    Effect.gen(function* () {
        const accessKeyId = yield* Config.redacted("SPACES_KEY");
        const secretAccessKey = yield* Config.redacted("SPACES_SECRET");
        const endpoint = yield* Config.string("S3_ENDPOINT");
        const region = yield* Config.string("S3_REGION").pipe(Config.withDefault("us-east-1"));
        const forcePathStyle = yield* Config.boolean("S3_FORCE_PATH_STYLE").pipe(Config.withDefault(false));

        return S3.layer({
            forcePathStyle,
            endpoint,
            region,
            credentials: {
                accessKeyId: Redacted.value(accessKeyId),
                secretAccessKey: Redacted.value(secretAccessKey),
            },
        });
    })
);

const PacedHttpLive = Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
        const limiter = yield* RateLimiter.make;
        const httpClient = yield* HttpClient.HttpClient;

        return httpClient.pipe(
            HttpClient.withRateLimiter({
                limiter,
                limit: 10,
                algorithm: "token-bucket",
                window: Duration.minutes(1),
                key: () => "archivist",
            }),
            HttpClient.transformResponse(Effect.catchTag("RateLimiterError", Effect.die))
        );
    })
).pipe(Layer.provide([FetchHttpClient.layer, RateLimiter.layerStoreMemory]));

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("ARCHIVIST"));
const ConfigLive = ConfigProvider.nested(ConfigProvider.fromEnv(), "ARCHIVIST");

export const Live = Layer.mergeAll(
    ObjectStorageLive,
    AndroidDevice.EmbeddedPixel7aLive,
    PlayAccount.layerConfig(),
    Layer.succeed(References.MinimumLogLevel, "Debug")
).pipe(
    Layer.provideMerge(PacedHttpLive),
    Layer.provideMerge(ConfigProvider.layer(ConfigLive)),
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provideMerge(NodeServices.layer)
);

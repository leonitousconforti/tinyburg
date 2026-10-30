import { Config, ConfigProvider, Duration, Effect, Layer, Redacted, References } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { S3 } from "@effect-aws/client-s3";
import { NodeServices } from "@effect/platform-node";
import { AndroidDevice, PlayAccount } from "@efffrida/gplayapi";

const ObjectStorageLive = Layer.unwrap(
    Effect.gen(function* () {
        const accessKeyId = yield* Config.Redacted("SPACES_KEY");
        const secretAccessKey = yield* Config.Redacted("SPACES_SECRET");
        const endpoint = yield* Config.String("S3_ENDPOINT");
        const region = yield* Config.String("S3_REGION").pipe(Config.withDefault("us-east-1"));
        const forcePathStyle = yield* Config.Boolean("S3_FORCE_PATH_STYLE").pipe(Config.withDefault(false));

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

const ConfigProviderLive = ConfigProvider.fromEnv().pipe(ConfigProvider.nested("ARCHIVIST"), ConfigProvider.layer);

export const Live = Layer.mergeAll(
    ObjectStorageLive,
    AndroidDevice.EmbeddedPixel7aLive,
    PlayAccount.layerAuroraDispenser(),
    Layer.succeed(References.MinimumLogLevel, "Debug")
).pipe(
    Layer.provideMerge(PacedHttpLive),
    Layer.provideMerge(ConfigProviderLive),
    Layer.provideMerge(NodeServices.layer)
);

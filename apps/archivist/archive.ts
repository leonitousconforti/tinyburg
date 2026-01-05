import { S3 } from "@effect-aws/client-s3";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import { NodeStream } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";
import { Array, Effect } from "effect";

const bundleIdentifier = "com.nimblebit.tinytower";

export const archiveToS3 = Effect.fnUntraced(function* ({
    offerType,
    versionCode,
}: {
    offerType: number;
    versionCode: number | bigint;
}) {
    const { encodedDeliveryToken } = yield* GooglePlayApi.purchase(bundleIdentifier, {
        offerType,
        versionCode,
    });

    const deliveryResult = yield* GooglePlayApi.delivery(bundleIdentifier, {
        offerType,
        versionCode,
        deliveryToken: encodedDeliveryToken,
    });

    const mainDeliveryData = deliveryResult?.appDeliveryData;
    if (mainDeliveryData === undefined) {
        return yield* Effect.logDebug(`No delivery data for version code ${versionCode}`);
    }

    const main = Effect.gen(function* () {
        const httpClient = yield* HttpClient.HttpClient;
        const stream = HttpClientResponse.stream(httpClient.get(mainDeliveryData.downloadUrl));
        yield* S3.putObject({
            ACL: "private",
            Bucket: "tinyburg-cold",
            Key: `archivist/${versionCode}/${bundleIdentifier}.apk`,
            Body: NodeStream.toReadableNever(stream),
            ContentLength: Number(mainDeliveryData.downloadSize),
        });
    });

    const splits = Array.map(mainDeliveryData.splitDeliveryData, (split) =>
        Effect.gen(function* () {
            const httpClient = yield* HttpClient.HttpClient;
            const stream = HttpClientResponse.stream(httpClient.get(split.downloadUrl));
            yield* S3.putObject({
                ACL: "private",
                Bucket: "tinyburg-cold",
                Key: `archivist/${versionCode}/${split.name}.apk`,
                Body: NodeStream.toReadableNever(stream),
                ContentLength: Number(split.downloadSize),
            });
        })
    );

    const expansions = Array.map(mainDeliveryData.additionalFile, (expansion) =>
        Effect.gen(function* () {
            const httpClient = yield* HttpClient.HttpClient;
            const typeStr = expansion.fileType === 1 ? "main" : "patch";
            const name = `${typeStr}.${expansion.versionCode}.${bundleIdentifier}.obb`;
            const stream = HttpClientResponse.stream(httpClient.get(expansion.downloadUrl));
            yield* S3.putObject({
                ACL: "private",
                Bucket: "tinyburg-cold",
                Key: `archivist/${versionCode}/${name}`,
                Body: NodeStream.toReadableNever(stream),
                ContentLength: Number(expansion.size),
            });
        })
    );

    return yield* Effect.all([main, ...splits, ...expansions]);
}, Effect.asVoid);

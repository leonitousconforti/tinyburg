import { S3 } from "@effect-aws/client-s3";
import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";
import { Effect } from "effect";

import { archiveToS3 } from "./archive.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    const bundleIdentifier = "com.nimblebit.tinytower";
    const details = yield* GooglePlayApi.details(bundleIdentifier);
    const versionCode = details.item?.details?.appDetails?.versionCode ?? 0n;

    yield* Effect.catchTag(
        S3.getObject({ Bucket: "tinyburg-cold", Key: `archivist/${versionCode}/${bundleIdentifier}.apk` }),
        "NoSuchKey",
        () => archiveToS3({ offerType: details.item?.offer[0].offerType ?? 1, versionCode })
    );
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

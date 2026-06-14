import { Effect } from "effect";

import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";

import { archiveToS3 } from "./archive.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    const bundleIdentifier = "com.nimblebit.tinytower";
    const { item } = yield* GooglePlayApi.details(bundleIdentifier);
    const maxVersionCode = item?.details?.appDetails?.versionCode ?? 0n;
    for (let versionCode = BigInt(0); versionCode < maxVersionCode; versionCode++) {
        yield* Effect.logInfo(`Archiving ${bundleIdentifier} version ${versionCode}`);
        yield* archiveToS3({ offerType: item?.offer[0].offerType ?? 1, versionCode });
    }
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

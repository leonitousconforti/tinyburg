import { Effect } from "effect";

import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";

import { archiveToS3 } from "./archive.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    const bundleIdentifier = "com.nimblebit.tinytower";
    const details = yield* GooglePlayApi.details(bundleIdentifier);
    const versionCode = details.item?.details?.appDetails?.versionCode ?? 0n;
    yield* Effect.logInfo(`Archiving ${bundleIdentifier} version ${versionCode}`);
    yield* archiveToS3({ offerType: details.item?.offer[0].offerType ?? 1, versionCode });
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

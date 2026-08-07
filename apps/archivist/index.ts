import { Effect } from "effect";

import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";

import { archiveToS3 } from "./archive.ts";
import { bundleIdentifiers } from "./games.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    for (const bundleIdentifier of bundleIdentifiers) {
        const details = yield* GooglePlayApi.details(bundleIdentifier);
        const versionCode = details.item?.details?.appDetails?.versionCode ?? 0n;
        yield* Effect.logInfo(`Archiving ${bundleIdentifier} version ${versionCode}`);
        yield* archiveToS3({ bundleIdentifier, offerType: details.item?.offer[0].offerType ?? 1, versionCode });
    }
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

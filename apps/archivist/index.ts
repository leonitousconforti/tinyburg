import { Effect, Option } from "effect";

import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";

import { archiveToS3, highestArchivedVersion } from "./archive.ts";
import { bundleIdentifiers } from "./games.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    for (const bundleIdentifier of bundleIdentifiers) {
        const details = yield* GooglePlayApi.details(bundleIdentifier);
        const offerType = details.item?.offer[0].offerType ?? 1;

        const mostRecentPublishedVersionCode = details.item?.details?.appDetails?.versionCode ?? 0n;
        const highestArchivedVersionCode = yield* highestArchivedVersion(bundleIdentifier).pipe(
            Effect.map(Option.getOrElse(() => 0n))
        );

        if (highestArchivedVersionCode >= mostRecentPublishedVersionCode) {
            yield* Effect.logInfo(`${bundleIdentifier} is up to date at version ${mostRecentPublishedVersionCode}`);
            continue;
        }

        yield* Effect.logInfo(
            `Archiving ${bundleIdentifier} versions ${highestArchivedVersionCode} through ${mostRecentPublishedVersionCode + 1n}`
        );

        for (
            let versionCode = highestArchivedVersionCode;
            versionCode < mostRecentPublishedVersionCode;
            versionCode++
        ) {
            yield* archiveToS3({
                bundleIdentifier,
                offerType,
                versionCode,
            });
        }
    }
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

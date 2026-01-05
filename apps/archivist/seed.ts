import { NodeRuntime } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";
import { Effect } from "effect";

import { archiveToS3 } from "./archive.ts";
import { Live } from "./layers.ts";

Effect.gen(function* () {
    const { item } = yield* GooglePlayApi.details("com.nimblebit.tinytower");
    for (let versionCode = BigInt(0); versionCode < (item?.details?.appDetails?.versionCode ?? 0n); versionCode++) {
        yield* archiveToS3({ offerType: item?.offer[0].offerType ?? 1, versionCode });
    }
}).pipe(Effect.provide(Live), NodeRuntime.runMain);

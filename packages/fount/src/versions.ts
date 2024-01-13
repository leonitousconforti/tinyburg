import {
    Games,
    RelativeVersion,
    SemanticVersion,
    SemanticVersionAndAppVersionCode,
    SemanticVersionsByRelativeVersions,
} from "./types.js";

import * as Http from "@effect/platform/HttpClient";
import { Chunk, Effect, HashMap, ReadonlyArray, Tuple, Option, Stream, pipe, flow, identity } from "effect";

// TODO: Record some actually interesting events/versions
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedVersions = {
    [Games.BitCity]: {
        a1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        a2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.TinyTower]: {
        b1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        b2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.LegoTower]: {
        c1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        c2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.PocketFrogs]: {
        d1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        d2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.PocketPlanes]: {
        e1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        e2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.PocketTrains]: {
        f1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        f2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
    [Games.TinyTowerVegas]: {
        g1: { semanticVersion: "0.0.0", appVersionCode: "0" },
        g2: { semanticVersion: "0.0.0", appVersionCode: "0" },
    },
} satisfies { [game in Games]: { [eventVersion: string]: SemanticVersionAndAppVersionCode } };

/** @internal */
export const getSemanticVersionsByRelativeVersionsEffect = (
    game: Games
): Effect.Effect<never, Http.error.HttpClientError, SemanticVersionsByRelativeVersions> =>
    Effect.gen(function* (_: Effect.Adapter) {
        // Helper to recursively fetch all paginated version feed pages
        const paginatedStream: Stream.Stream<never, Http.error.HttpClientError, string> = Stream.unfoldEffect(0, (pg) =>
            Http.request.get(`https://apk.support/app/${game}/versions?page=${pg}`).pipe(
                Http.client.fetch(),
                Effect.flatMap((response) => response.text),
                Effect.map(Option.liftPredicate((maybeResponseWithContent) => maybeResponseWithContent !== "")),
                Effect.map(Option.map((responseWithContent) => [responseWithContent, pg + 1]))
            )
        );

        const allResponses: string = yield* _(Stream.runCollect(paginatedStream).pipe(Effect.map(Chunk.join(""))));
        const versionRegex: RegExp = new RegExp(/div class="stitle">[\s\w:\u00AE\-]*(\d+\.\d+\.\d+)\((\d+)\)<\/div/gim);

        return pipe(
            // Match all the versions in the paginated versions feed
            ReadonlyArray.fromIterable([...allResponses.matchAll(versionRegex)]),
            ReadonlyArray.map(([_x, y, z]) => Tuple.make(y as SemanticVersion, z)),

            // If there are spillover versions somehow between the pages, get rid of them
            ReadonlyArray.dedupeAdjacent,

            // Regex / array index could have returned undefined, so let's convert
            // to options and then zip the while object to an options as long as both
            // the required properties are present
            ReadonlyArray.map(Tuple.mapBoth({ onFirst: Option.fromNullable, onSecond: Option.fromNullable })),
            ReadonlyArray.map((x) => Option.zipWith(Tuple.getFirst(x), Tuple.getSecond(x), Tuple.make)),
            ReadonlyArray.map(Option.map((x) => ({ semanticVersion: x[0], appVersionCode: x[1] }))),

            // Index the semantic version tuples and put the relative version first
            ReadonlyArray.map(flow(Tuple.make, Tuple.swap)),
            ReadonlyArray.map(Tuple.mapFirst((index) => `${index} versions before latest` as RelativeVersion)),

            // We kept entries that were Option.None from earlier to ensure that we
            // generate the correct indexes, now we can lift the option again and
            // get rid of all entries that are still Option.None
            ReadonlyArray.map((x) => Option.zipWith(Option.some(Tuple.getFirst(x)), Tuple.getSecond(x), Tuple.make)),
            ReadonlyArray.compact,

            // We need to add an entry for "latest version" which we can achieve by
            // duplicating the first entry in the list and changing its relative version.
            // It is always guaranteed that the first entry is the latest version because
            // that is the way apk.support has arranged the versions feed
            ReadonlyArray.flatMap((x, index) => (identity(index) ? [x] : ([["latest version", x[1]], x] as const))),

            // Convert to a hashmap
            HashMap.fromIterable
        );
    });

/**
 * Retrieves a map of semantic versions like "1.2.3" by relative versions like
 * "2 versions before latest" from an apksupport versions page.
 */
export const getSemanticVersionsByRelativeVersions = (
    game: Games
): Promise<Map<RelativeVersion, SemanticVersionAndAppVersionCode>> =>
    getSemanticVersionsByRelativeVersionsEffect(game)
        .pipe(Effect.orDie)
        .pipe(Effect.map(HashMap.toEntries))
        .pipe(Effect.map((entries) => new Map(entries)))
        .pipe(Effect.runPromise);

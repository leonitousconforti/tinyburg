import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as ReadonlyArray from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as Tuple from "effect/Tuple";

import {
    type AnyGame,
    RelativeVersion,
    SemanticVersion,
    SemanticVersionAndAppVersionCode,
    SemanticVersionsByRelativeVersions,
} from "./schemas.js";

// TODO: Record some actually interesting events/versions
export const trackedVersions = {
    ["com.nimblebit.bitcity"]: {
        a1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        a2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
    ["com.nimblebit.tinytower"]: {
        b1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        b2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
    ["com.nimblebit.legotower"]: {
        c1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        c2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
    ["com.nimblebit.pocketfrogs"]: {
        d1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        d2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
    ["com.nimblebit.pocketplanes"]: {
        e1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        e2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
    ["com.nimblebit.pockettrains"]: {
        f1: { semanticVersion: "0.0.0", appVersionCode: 0 },
        f2: { semanticVersion: "0.0.0", appVersionCode: 0 },
    },
} as const satisfies {
    [game in AnyGame]: {
        [eventVersion: string]: typeof SemanticVersionAndAppVersionCode.Type;
    };
};

/**
 * @since 1.0.0
 * @category Types
 */
export type TrackedVersion<T extends AnyGame> = keyof (typeof trackedVersions)[T];

/**
 * @since 1.0.0
 * @category Types
 */
export type AllTrackedVersions = { [K in AnyGame]: TrackedVersion<K> }[AnyGame];

/**
 * Retrieves a map of semantic versions like "1.2.3" by relative versions like
 * "2 versions before latest" from an apksupport versions page.
 */
export const getSemanticVersionsByRelativeVersions = (
    game: AnyGame
): Effect.Effect<
    typeof SemanticVersionsByRelativeVersions.Type,
    HttpClientError.HttpClientError | ParseResult.ParseError,
    never
> =>
    Effect.gen(function* () {
        // Helper to recursively fetch all paginated version feed pages
        const paginatedStream: Stream.Stream<
            string,
            HttpClientError.HttpClientError,
            Scope.Scope | HttpClient.HttpClient
        > = Stream.unfoldEffect(0, (pg) =>
            Function.pipe(
                HttpClientRequest.get(`https://apk.support/app/${game}/versions?page=${pg}`),
                HttpClient.execute,
                Effect.flatMap((response) => response.text),
                Effect.map(Option.liftPredicate((maybeResponseWithContent) => maybeResponseWithContent !== "")),
                Effect.map(Option.map((responseWithContent) => [responseWithContent, pg + 1] as const))
            )
        );

        const allResponses = yield* Stream.runCollect(paginatedStream)
            .pipe(Effect.map(Chunk.join("")))
            .pipe(Effect.provide(FetchHttpClient.layer))
            .pipe(Effect.scoped);

        const versionRegex = new RegExp(/p class="verlist">[\s\w:\u00AE-]*(\d+\.\d+\.\d+)\((\d+)\)<\/p/gim);

        return yield* Function.pipe(
            // Match all the versions in the paginated versions feed
            ReadonlyArray.fromIterable([...allResponses.matchAll(versionRegex)]),
            ReadonlyArray.map(([_x, y, z]) => Tuple.make(y as typeof SemanticVersion.Encoded, z)),

            // If there are spillover versions somehow between the pages, get rid of them
            ReadonlyArray.dedupeWith((x, y) => x[0] === y[0] && x[1] === y[1]),

            // Regex / array index could have returned undefined, so let's convert
            // to options and then zip the while object to an options as long as both
            // the required properties are present
            ReadonlyArray.map(Tuple.mapBoth({ onFirst: Option.fromNullable, onSecond: Option.fromNullable })),
            ReadonlyArray.map((x) => Option.zipWith(Tuple.getFirst(x), Tuple.getSecond(x), Tuple.make)),
            ReadonlyArray.map(Option.map((x) => ({ semanticVersion: x[0], appVersionCode: x[1] }))),

            // Index the semantic version tuples and put the relative version first
            ReadonlyArray.map(Function.flow(Tuple.make, Tuple.swap)),
            ReadonlyArray.map(
                Tuple.mapFirst((index) => `${index} versions before latest` as typeof RelativeVersion.Encoded)
            ),

            // We kept entries that were Option.None from earlier to ensure that we
            // generate the correct indexes, now we can lift the option again and
            // get rid of all entries that are still Option.None
            ReadonlyArray.map((x) => Option.zipWith(Option.some(Tuple.getFirst(x)), Tuple.getSecond(x), Tuple.make)),
            ReadonlyArray.getSomes,

            // We need to add an entry for "latest version" which we can achieve by
            // duplicating the first entry in the list and changing its relative version.
            // It is always guaranteed that the first entry is the latest version because
            // that is the way apk.support has arranged the versions feed
            ReadonlyArray.flatMap((x, index) =>
                Function.identity(index) ? [x] : ([["latest version", x[1]], x] as const)
            ),

            // Convert to a hashmap
            (x) => Schema.decode(SemanticVersionsByRelativeVersions)(x)
        );
    });

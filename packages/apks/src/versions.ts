import {
    type RelativeVersion,
    type RequestedGame,
    type SemanticVersion,
    type SemanticVersionsByRelativeVersions,
} from "./types.js";

import rssParser from "rss-parser";
import * as Http from "@effect/platform/HttpClient";
import { Effect, HashMap, ReadonlyArray, Tuple, Option, pipe, flow, identity } from "effect";

// TODO: Record some interesting events/versions
// Important TinyTower versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedTinyTowerVersions = { a: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVersions = keyof typeof trackedTinyTowerVersions;

// TODO: Record some interesting events/versions
// Important LegoTower versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedLegoTowerVersions = { b: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedLegoTowerVersions = keyof typeof trackedLegoTowerVersions;

// TODO: Record some interesting events/versions
// Important TinyTowerVegas versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedTinyTowerVegasVersions = { c: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVegasVersions = keyof typeof trackedTinyTowerVegasVersions;

// TODO: Record some interesting events/versions
// Important BitCity versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedBitCityVersions = { d: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedBitCityVersions = keyof typeof trackedBitCityVersions;

// TODO: Record some interesting events/versions
// Important PocketTrains versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedPocketTrainsVersions = { e: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedPocketTrainsVersions = keyof typeof trackedPocketTrainsVersions;

// TODO: Record some interesting events/versions
// Important PocketPlanes versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedPocketPlanesVersions = { f: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedPocketPlanesVersions = keyof typeof trackedPocketPlanesVersions;

// TODO: Record some interesting events/versions
// Important PocketFrogs versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedPocketFrogsVersions = { g: "0.0.0" } satisfies Record<string, SemanticVersion>;
export type TrackedPocketFrogsVersions = keyof typeof trackedPocketFrogsVersions;

// Where to find the versions of the games on apkpure
const versionRssFeeds: { [k in RequestedGame]: string } = {
    TinyTower: "apk/nimblebit-llc/tiny-tower/feed",
    LegoTower: "apk/nimblebit-llc/lego-tower/feed",
    TinyTowerVegas: "apk/nimblebit-llc/tiny-tower-vegas/feed",
    BitCity: "apk/nimblebit-llc/bit-city-pocket-town-planner/feed",
    PocketTrains: "apk/nimblebit-llc/pocket-trains-enterprise-sim/feed",
    PocketFrogs: "apk/nimblebit-llc/pocket-frogs-tiny-pond-keeper/feed",
    PocketPlanes: "apk/nimblebit-llc/pocket-frogs-tiny-pond-keeper/feed",
};

/**
 * Retrieves a map of semantic versions like "1.2.3" by relative versions like
 * "2 versions before latest" from an apkpure versions page.
 *
 * @param game - The game you are requesting the versions for
 * @returns - A map of relative versions to semantic versions
 */
export const getSemanticVersionsByRequestedVersions = (
    game: RequestedGame
): Effect.Effect<
    Http.client.Client.Default,
    Http.error.HttpClientError | Http.error.ResponseError,
    SemanticVersionsByRelativeVersions
> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const effectHttpClient: Http.client.Client.Default = yield* _(Http.client.Client);

        const client: Http.client.Client.WithResponse<never, Http.error.HttpClientError> = pipe(
            effectHttpClient,
            Http.client.filterStatusOk,
            Http.client.mapRequest(Http.request.prependUrl("https://www.apkmirror.com/"))
        );

        const request: Http.request.ClientRequest = pipe(
            Http.request.get(versionRssFeeds[game]),
            Http.request.accept("application/xml")
        );

        interface IRssFeed {
            link: string;
            title: string;
            description: string;
        }

        interface IRssItem {
            link: string;
            guid: string;
            title: string;
            pubDate: string;
            isoDate: string;
            content: string;
            contentSnippet: string;
        }

        const response: Http.response.ClientResponse = yield* _(client(request));
        const responseText: string = yield* _(response.text);
        const responseJson: IRssFeed & rssParser.Output<IRssItem> = yield* _(
            Effect.promise(() => new rssParser<IRssFeed, IRssItem>().parseString(responseText))
        );

        return pipe(
            responseJson.items,
            ReadonlyArray.fromIterable,
            ReadonlyArray.map((x) => x.title),
            ReadonlyArray.map(flow(Tuple.tuple, Tuple.swap)),
            ReadonlyArray.map(Tuple.mapFirst((index) => `${index} versions before latest` as RelativeVersion)),
            ReadonlyArray.map(Tuple.mapSecond((x) => x.match(/\d+\.\d+\.\d+/)?.[0] as SemanticVersion | undefined)),
            ReadonlyArray.map(Tuple.mapBoth({ onFirst: Option.fromNullable, onSecond: Option.fromNullable })),
            ReadonlyArray.map((x) => Option.zipWith(Tuple.getFirst(x), Tuple.getSecond(x), Tuple.tuple)),
            ReadonlyArray.filterMap(identity),
            HashMap.fromIterable,
            HashMap.mutate((x) =>
                Option.map(HashMap.get(x, "0 versions before latest"), (y) => HashMap.set(x, "latest version", y))
            )
        );
    });

import { Effect, Scope, HashMap, Data } from "effect";
import {
    trackedBitCityVersions,
    trackedTinyTowerVersions,
    trackedLegoTowerVersions,
    trackedPocketFrogsVersions,
    trackedPocketTrainsVersions,
    trackedPocketPlanesVersions,
    trackedTinyTowerVegasVersions,
    type TrackedBitCityVersions,
    type TrackedTinyTowerVersions,
    type TrackedLegoTowerVersions,
    type TrackedPocketFrogsVersions,
    type TrackedPocketTrainsVersions,
    type TrackedPocketPlanesVersions,
    type TrackedTinyTowerVegasVersions,
} from "./versions.js";

// Version types
export type SemanticVersion = `${number}.${number}.${number}`;
export type SemanticVersionsByRelativeVersions = HashMap.HashMap<RelativeVersion, SemanticVersion>;
export type RelativeVersion = "latest version" | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9} versions before latest`;
export type AnyVersion =
    | SemanticVersion
    | RelativeVersion
    | TrackedBitCityVersions
    | TrackedTinyTowerVersions
    | TrackedLegoTowerVersions
    | TrackedPocketFrogsVersions
    | TrackedPocketTrainsVersions
    | TrackedPocketPlanesVersions
    | TrackedTinyTowerVegasVersions;

// Supplier, game, and architecture types
export type RequestedSupplier = "apkmirror" | "apkpure" | "patched";
export type RequestedArchitecture = "armeabi-v7a" | "arm64-v8a" | "arm64-v8a + armeabi-v7a";
export type RequestedGame =
    | "TinyTower"
    | "LegoTower"
    | "TinyTowerVegas"
    | "BitCity"
    | "PocketFrogs"
    | "PocketTrains"
    | "PocketPlanes";

// Any errors that might occur during web scraping
export class ApkpureScrapingError extends Data.TaggedError("Apkpure")<{ message: string }> {}
export class ApkmirrorScrapingError extends Data.TaggedError("Apkmirror")<{ message: string }> {}

// Type of a function that fetches the download url and details of an apk.
export type PuppeteerFetcher = (
    game: RequestedGame,
    semanticVersion: SemanticVersion,
    architecture: RequestedArchitecture
) => Effect.Effect<
    Scope.Scope,
    ApkpureScrapingError | ApkmirrorScrapingError,
    readonly [downloadUrl: string, details: IPuppeteerDetails]
>;

// TODO: Implement approximate file size and SHA256 checksum fields
export interface IPuppeteerDetails {
    /** The name of the apk. */
    name: string;

    /** The date this update was pushed on. */
    updatedDate?: string;

    /** SHA256 checksum of the apk */
    sha256?: string;

    /** Approximate download size of the apk in megabytes. */
    approximateFileSizeMB?: number;

    /** The semantic version of this apk. */
    semVer: SemanticVersion;

    /** Supplier of the apk. */
    supplier: RequestedSupplier;

    /** The architecture of the apk. */
    architecture: RequestedArchitecture;
}

// Default supplier, version, and architect to fetch if none are specified
export const defaultSupplier: RequestedSupplier = "apkpure";
export const defaultVersion: RelativeVersion = "latest version";
export const defaultArchitecture: RequestedArchitecture = "arm64-v8a";

// Helpers to determine what type of version string was provided
export const isSemanticVersion = (version: string): version is SemanticVersion => /^\d+\.\d+\.\d+$/.test(version);
export const isRelativeVersion = (version: string): version is RelativeVersion =>
    version === "latest version" || /^\d versions before latest$/.test(version);
export const isRelativeVersionLatest = (relativeVersion: RelativeVersion): relativeVersion is "latest version" =>
    relativeVersion === "latest version";
export const isRelativeVersionBeforeLatest = (
    relativeVersion: RelativeVersion
): relativeVersion is `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9} versions before latest` =>
    relativeVersion !== "latest version";

// Helpers to determine if a given string is a tracked version
export const isTrackedBitCityVersion = (version: string): version is TrackedBitCityVersions =>
    Boolean(Object.keys(trackedBitCityVersions).includes(version));
export const isTrackedTinyTowerVersion = (version: string): version is TrackedTinyTowerVersions =>
    Boolean(Object.keys(trackedTinyTowerVersions).includes(version));
export const isTrackedLegoTowerVersion = (version: string): version is TrackedLegoTowerVersions =>
    Boolean(Object.keys(trackedLegoTowerVersions).includes(version));
export const isTrackedTinyTowerVegasVersion = (version: string): version is TrackedTinyTowerVegasVersions =>
    Boolean(Object.keys(trackedTinyTowerVegasVersions).includes(version));
export const isTrackedPocketFrogsVersion = (version: string): version is TrackedPocketFrogsVersions =>
    Boolean(Object.keys(trackedPocketFrogsVersions).includes(version));
export const isTrackedPocketTrainsVersion = (version: string): version is TrackedPocketTrainsVersions =>
    Boolean(Object.keys(trackedPocketTrainsVersions).includes(version));
export const isTrackedPocketPlanesVersion = (version: string): version is TrackedPocketPlanesVersions =>
    Boolean(Object.keys(trackedPocketPlanesVersions).includes(version));

import * as HashMap from "effect/HashMap";
import { trackedVersions } from "./versions.js";

export enum Games {
    BitCity = "com.nimblebit.bitcity",
    TinyTower = "com.nimblebit.tinytower",
    LegoTower = "com.nimblebit.legotower",
    // TinyTowerVegas = "com.nimblebit.vegas",
    PocketFrogs = "com.nimblebit.pocketfrogs",
    PocketPlanes = "com.nimblebit.pocketplanes",
    PocketTrains = "com.nimblebit.pockettrains",
}

// Version types, all the different ways to specify a version
export type AppVersionCode = string;
export type SemanticVersion = `${number}.${number}.${number}`;
export type RelativeVersion = "latest version" | `${number} versions before latest`;
export type TrackedVersion<T extends Games> = keyof (typeof trackedVersions)[T];

// More version types
export type AllTrackedVersions = { [K in Games]: TrackedVersion<K> }[Games];
export type AnyVersion = RelativeVersion | SemanticVersion | AllTrackedVersions;
export type SemanticVersionAndAppVersionCode = { semanticVersion: SemanticVersion; appVersionCode: AppVersionCode };
export type SemanticVersionsByRelativeVersions = HashMap.HashMap<RelativeVersion, SemanticVersionAndAppVersionCode>;

// Version type guard helpers
export const isSemanticVersion = (version: string): version is SemanticVersion => /^\d+\.\d+\.\d+$/.test(version);
export const isRelativeVersion = (version: string): version is RelativeVersion =>
    version === "latest version" || /^\d+ versions before latest$/.test(version);

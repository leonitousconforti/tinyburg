import * as Schema from "@effect/schema/Schema";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";

import { trackedVersions } from "./versions.js";

/**
 * All Nimblebit games that are supported by @tinyburg/fount.
 *
 * @since 1.0.0
 * @category Constants
 */
export enum Games {
    BitCity = "com.nimblebit.bitcity",
    TinyTower = "com.nimblebit.tinytower",
    LegoTower = "com.nimblebit.legotower",
    PocketFrogs = "com.nimblebit.pocketfrogs",
    PocketPlanes = "com.nimblebit.pocketplanes",
    PocketTrains = "com.nimblebit.pockettrains",
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const GamesSchema: Schema.Enums<typeof Games> = Schema.Enums(Games);

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $AppVersionCode
    extends Schema.Annotable<
        $AppVersionCode,
        Schema.Schema.Encoded<Schema.$Number>,
        Schema.Schema.Encoded<Schema.$String>,
        never
    > {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type AppVersionCode = Schema.Schema.Type<$AppVersionCode>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type AppVersionCodeEncoded = Schema.Schema.Encoded<$AppVersionCode>;

/**
 * A positive integer used as an internal version number. This number helps
 * determine whether one version is more recent than another, with higher
 * numbers indicating more recent versions. This is not the version number shown
 * to users; that number is set by the versionName setting. The Android system
 * uses the versionCode value to protect against downgrades by preventing users
 * from installing an APK with a lower versionCode than the version currently
 * installed on their device.
 *
 * @since 1.0.0
 * @category Schemas
 * @see https://developer.android.com/studio/publish/versioning#versioningsettings
 */
export const AppVersionCode: $AppVersionCode = Function.pipe(
    Schema.NumberFromString,
    Schema.int(),
    Schema.greaterThan(0),
    Schema.lessThanOrEqualTo(2_100_000_000)
).annotations({
    identifier: "AppVersionCode",
    title: "App Version Code",
    description: "The version code of an app",
});

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $SemanticVersion
    extends Schema.Annotable<
        $SemanticVersion,
        `${number}.${number}.${number}`,
        `${number}.${number}.${number}`,
        never
    > {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type SemanticVersion = Schema.Schema.Type<$SemanticVersion>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type SemanticVersionEncoded = Schema.Schema.Encoded<$SemanticVersion>;

/**
 * A string used as the version number shown to users. This setting can be
 * specified as a raw string or as a reference to a string resource.
 *
 * The value is a string so that you can describe the app version as a
 * <major>.<minor>.<point> string or as any other type of absolute or relative
 * version identifier. The versionName is the only value displayed to users.
 *
 * @since 1.0.0
 * @category Schemas
 * @see https://developer.android.com/studio/publish/versioning#versioningsettings
 */
export const SemanticVersion: $SemanticVersion = Schema.TemplateLiteral(
    Schema.Number,
    Schema.Literal("."),
    Schema.Number,
    Schema.Literal("."),
    Schema.Number
).annotations({
    identifier: "SemanticVersion",
    title: "Semantic Version",
    description: "The semantic version of an app",
});

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $RelativeVersion
    extends Schema.Annotable<
        $RelativeVersion,
        "latest version" | `${number} versions before latest`,
        "latest version" | `${number} versions before latest`,
        never
    > {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type RelativeVersion = Schema.Schema.Type<$RelativeVersion>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type RelativeVersionEncoded = Schema.Schema.Encoded<$RelativeVersion>;

/**
 * A custom relative version specifier
 *
 * @since 1.0.0
 * @category Schemas
 */
export const RelativeVersion: $RelativeVersion = Schema.Union(
    Schema.Literal("latest version"),
    Schema.TemplateLiteral(Schema.Number, Schema.Literal(" versions before latest"))
).annotations({
    identifier: "RelativeVersion",
    title: "Relative Version",
    description: "A relative version specifier",
});

/**
 * TODO: make a schema for this?
 *
 * @since 1.0.0
 * @category Decoded types
 */
export type TrackedVersion<T extends Games> = keyof (typeof trackedVersions)[T];

/**
 * TODO: make a schema for this?
 *
 * @since 1.0.0
 * @category Decoded types
 */
export type AllTrackedVersions = { [K in Games]: TrackedVersion<K> }[Games];

/**
 * TODO: make a schema for this?
 *
 * @since 1.0.0
 * @category Decoded types
 */
export type AnyVersion = RelativeVersion | SemanticVersion | AllTrackedVersions;

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $SemanticVersionAndAppVersionCode
    extends Schema.Struct<{
        semanticVersion: $SemanticVersion;
        appVersionCode: $AppVersionCode;
    }> {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type SemanticVersionAndAppVersionCode = Schema.Schema.Type<$SemanticVersionAndAppVersionCode>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type SemanticVersionAndAppVersionCodeEncoded = Schema.Schema.Encoded<$SemanticVersionAndAppVersionCode>;

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SemanticVersionAndAppVersionCode: $SemanticVersionAndAppVersionCode = Schema.Struct({
    semanticVersion: SemanticVersion,
    appVersionCode: AppVersionCode,
}).annotations({
    identifier: "SemanticVersionAndAppVersionCode",
    title: "Semantic Version And App Version Code",
    description: "A semantic version and app version code pair",
});

/**
 * @since 1.0.0
 * @category Api interface
 */
export interface $SemanticVersionsByRelativeVersions
    extends Schema.Annotable<
        $SemanticVersionsByRelativeVersions,
        HashMap.HashMap<RelativeVersion, SemanticVersionAndAppVersionCode>,
        ReadonlyArray<readonly [RelativeVersionEncoded, SemanticVersionAndAppVersionCodeEncoded]>,
        never
    > {}

/**
 * @since 1.0.0
 * @category Decoded types
 */
export type SemanticVersionsByRelativeVersions = Schema.Schema.Type<$SemanticVersionsByRelativeVersions>;

/**
 * @since 1.0.0
 * @category Encoded types
 */
export type SemanticVersionsByRelativeVersionsEncoded = Schema.Schema.Encoded<$SemanticVersionsByRelativeVersions>;

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SemanticVersionsByRelativeVersions: $SemanticVersionsByRelativeVersions = Schema.HashMap({
    key: RelativeVersion,
    value: SemanticVersionAndAppVersionCode,
}).annotations({
    identifier: "SemanticVersionsByRelativeVersions",
    title: "Semantic Versions By Relative Versions",
    description: "A map of relative versions to semantic versions",
});

import * as Function from "effect/Function";
import * as Schema from "effect/Schema";

/**
 * All Nimblebit games that are supported by @tinyburg/fount.
 *
 * @since 1.0.0
 * @category Constants
 */
export class Game extends Schema.Literal(
    "com.nimblebit.bitcity" as const,
    "com.nimblebit.tinytower" as const,
    "com.nimblebit.pocketfrogs" as const,
    "com.nimblebit.pocketplanes" as const,
    "com.nimblebit.pockettrains" as const
) {}

/**
 * @since 1.0.0
 * @category Types
 */
export type AnyGame = (typeof Game.literals)[number];

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
export class AppVersionCode extends Function.pipe(
    Schema.NumberFromString,
    Schema.int(),
    Schema.greaterThan(0),
    Schema.lessThanOrEqualTo(2_100_000_000)
).annotations({
    identifier: "AppVersionCode",
    title: "App Version Code",
    description: "The version code of an app",
}) {}

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
export class SemanticVersion extends Schema.TemplateLiteral(
    Schema.Number,
    Schema.Literal("." as const),
    Schema.Number,
    Schema.Literal("." as const),
    Schema.Number
).annotations({
    identifier: "SemanticVersion",
    title: "Semantic Version",
    description: "The semantic version of an app",
}) {}

/**
 * A custom relative version specifier
 *
 * @since 1.0.0
 * @category Schemas
 */
export class RelativeVersion extends Schema.Union(
    Schema.Literal("latest version" as const),
    Schema.TemplateLiteral(Schema.Number, Schema.Literal(" versions before latest"))
).annotations({
    identifier: "RelativeVersion",
    title: "Relative Version",
    description: "A relative version specifier",
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SemanticVersionAndAppVersionCode extends Schema.Struct({
    semanticVersion: SemanticVersion,
    appVersionCode: AppVersionCode,
}).annotations({
    identifier: "SemanticVersionAndAppVersionCode",
    title: "Semantic Version And App Version Code",
    description: "A semantic version and app version code pair",
}) {}

/**
 * @since 1.0.0
 * @category Schemas
 */
export class SemanticVersionsByRelativeVersions extends Schema.HashMap({
    key: RelativeVersion,
    value: SemanticVersionAndAppVersionCode,
}).annotations({
    identifier: "SemanticVersionsByRelativeVersions",
    title: "Semantic Versions By Relative Versions",
    description: "A map of relative versions to semantic versions",
}) {}

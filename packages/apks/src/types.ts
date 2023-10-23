export type SemanticVersion = `${number}.${number}.${number}`;
export type RelativeVersion = "latest version" | `${number} versions before latest`;
export type SemanticVersionsByRelativeVersions = Map<Exclude<RelativeVersion, "latest version">, SemanticVersion>;

export type RequestedSupplier = "apkmirror" | "apkpure" | "patched";
export type RequestedGame = "TinyTower" | "LegoTower" | "TinyTowerVegas";
export type RequestedArchitecture = "armeabi-v7a" | "arm64-v8a" | "arm64-v8a + armeabi-v7a";

// Type of a function that fetches the download url and details of an apk
export type PuppeteerFetcher = (
    game: RequestedGame,
    semanticVersion: `${number}.${number}.${number}`,
    architecture: RequestedArchitecture
) => Promise<[downloadUrl: string, details: IPuppeteerDetails]>;

// TODO: Implement approximate file size and SHA256 checksum fields
export interface IPuppeteerDetails {
    /** The name of the apk. */
    name: string;

    /** The date this update was pushed on. */
    updatedDate: string;

    /** SHA256 checksum of the apk */
    // sha256: string;

    /** Approximate download size of the apk in megabytes. */
    // approximateFileSizeMB: number;

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

export const isSemanticVersion = (version: string): version is SemanticVersion => /^\d+\.\d+\.\d+$/.test(version);
export const isRelativeVersion = (version: string): version is RelativeVersion =>
    version === "latest version" || /^\d+ versions before latest$/.test(version);

export type SemanticVersion = `${number}.${number}.${number}`;
export type RequestedSupplier = "apkmirror" | "apkpure" | "patched";
export type RequestedGame = "TinyTower" | "LegoTower" | "TinyTowerVegas";
export type RequestedVersion = "latest version" | `${number} versions before latest`;
export type RequestedArchitecture = "armeabi-v7a" | "arm64-v8a" | "arm64-v8a + armeabi-v7a";
export type SemanticVersionsByRequestedVersions = Record<Exclude<RequestedVersion, "latest version">, SemanticVersion>;

export interface IPuppeteerDetails {
    /** The name of the apk. */
    name: string;

    /** The date this update was pushed on. */
    updatedDate: string;

    /** The semantic version of this apk. */
    semVer: string;

    /** Approximate download size of the apk in megabytes. */
    // approximateFileSizeMB: number;

    /** Supplier of the apk. */
    supplier: RequestedSupplier;

    /** The architecture of the apk. */
    architecture: RequestedArchitecture;
}

export const defaultSupplier: RequestedSupplier = "apkmirror";
export const defaultVersion: RequestedVersion = "latest version";
export const defaultArchitecture: RequestedArchitecture = "arm64-v8a";

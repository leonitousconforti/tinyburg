import Debug from "debug";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

// prettier-ignore
// eslint-disable-next-line @rushstack/typedef-var
export const ApkpureVersions = ["3.15.0", "3.15.1", "3.15.2", "3.15.4", "3.16.1", "3.16.3", "3.16.6", "4.0.0", "4.0.1", "4.0.3", "4.0.5", "4.0.6", "4.1.0", "4.2.0", "4.2.1", "4.3.0", "4.3.1", "4.4.0", "4.5.0", "4.6.0", "4.7.0", "4.7.1", "4.8.0", "4.9.0", "4.10.0", "4.11.0", "4.11.1", "4.12.0", "4.13.0", "4.14.0"] as const;
export type ApkpureVersion = typeof ApkpureVersions[number];

// prettier-ignore
// eslint-disable-next-line @rushstack/typedef-var
export const ApkmirrorVersions = ["3.0.1", "3.3.10", "3.6.6", "3.7.3", "3.8.0", "3.9.1", "3.10.1", "3.11.1", "3.12.0", "3.12.1", "3.12.2", "3.12.3", "3.12.4", "3.13.0", "3.13.1", "3.13.2", "3.14.0", "3.14.1", "3.14.2", "3.15.0", "3.15.1", "3.15.2", "3.15.4", "3.16.0", "3.16.1", "3.16.2", "3.16.3", "3.16.4", "3.16.5", "3.16.6", "4.0.0", "4.0.1", "4.0.3", "4.0.4", "4.0.5", "4.0.6", "4.1.0", "4.2.0", "4.2.1", "4.3.0", "4.3.1", "4.4.0", "4.5.0", "4.6.0", "4.7.0", "4.7.1", "4.8.0", "4.9.0", "4.10.0", "4.11.1", "4.12.0", "4.13.0", "4.14.0"] as const;
export type ApkmirrorVersion = typeof ApkmirrorVersions[number];

// eslint-disable-next-line @rushstack/typedef-var
export const TinyTowerApkSources = ["apkpure", "apkmirror"] as const;
export type TinyTowerApkSource = typeof TinyTowerApkSources[number];
export type TinyTowerApkVersion = ApkpureVersion & ApkmirrorVersion;

const logger: Debug.Debugger = Debug.debug("tinyburg:apks");

export const loadApk = async (version: TinyTowerApkVersion, source: TinyTowerApkSource): Promise<string> => {
    logger("Loading version %s from %s downloads", version, source);

    const fileNames = await fs.readdir(new URL(`downloads/${source}`, import.meta.url));
    const file = fileNames.filter((fileName) => fileName.includes(version));
    return fileURLToPath(new URL(`downloads/${source}/${file}`, import.meta.url));
};
export default loadApk;

export const loadApkFromApkpure = (version: ApkpureVersion): Promise<string> =>
    loadApk(version as TinyTowerApkVersion, "apkpure");
export const loadApkFromApkmirror = (version: ApkmirrorVersion): Promise<string> =>
    loadApk(version as TinyTowerApkVersion, "apkmirror");

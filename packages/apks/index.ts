import Debug from "debug";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line @rushstack/typedef-var
export const TinyTowerApkSources = ["apkpure", "apkmirror"] as const;
export type TinyTowerApkSource = typeof TinyTowerApkSources[number];

// eslint-disable-next-line @rushstack/typedef-var
export const TinyTowerApkVersions = [
    "3.14.0",
    "3.14.1",
    "3.14.2",
    "3.15.0",
    "3.15.1",
    "3.15.2",
    "3.15.4",
    "3.16.1",
    "3.16.3",
    "3.16.4",
    "3.16.5",
    "3.16.6",
    "4.0.0",
    "4.0.1",
    "4.0.3",
    "4.0.5",
    "4.0.6",
    "4.1.0",
    "4.2.0",
    "4.2.1",
    "4.3.0",
    "4.3.1",
    "4.4.0",
    "4.5.0",
    "4.6.0",
    "4.7.0",
    "4.7.1",
    "4.8.0",
    "4.9.0",
    "4.10.0",
    "4.11.0",
    "4.11.1",
    "4.12.0",
] as const;
export type TinyTowerApkVersion = typeof TinyTowerApkVersions[number];

const logger: Debug.Debugger = Debug.debug("tinyburg:apks");

export const loadApk = (version: TinyTowerApkVersion, source: TinyTowerApkSource): string => {
    logger("Loading version %s from %s downloads", version, source);
    return fileURLToPath(new URL(`downloads/${source}/v${version}.apk`, import.meta.url));
};

export default loadApk;
export const loadApkFromApkpure = (version: TinyTowerApkVersion): string => loadApk(version, "apkpure");
export const loadApkFromApkmirror = (version: TinyTowerApkVersion): string => loadApk(version, "apkmirror");

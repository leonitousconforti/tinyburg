import type { PatchedVersion } from "./patched.type.js";
import type { ApkpureVersion } from "./apkpure.type.js";
import type { ApkmirrorVersion } from "./apkmirror.type.js";

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Debug from "debug";
const logger: Debug.Debugger = Debug.debug("tinyburg:apks");

// eslint-disable-next-line @rushstack/typedef-var
export const TinyTowerApkSources = ["apkpure", "apkmirror"] as const;
export type TinyTowerApkSource = (typeof TinyTowerApkSources)[number];
export type TinyTowerApkVersion = ApkpureVersion & ApkmirrorVersion;
export { LatestVersion } from "./latest-version.js";

export const loadApk = async <
    T extends TinyTowerApkSource | "patched",
    U extends T extends TinyTowerApkSource ? TinyTowerApkVersion : PatchedVersion
>(
    source: T,
    version: U
): Promise<string> => {
    logger("Loading version %s from %s downloads", version, source);
    const fileNames = await fs.readdir(new URL(`../downloads/${source}`, import.meta.url));
    const file = fileNames.find((fileName) => fileName.includes(version)) || version;
    return fileURLToPath(new URL(`../downloads/${source}/${file}`, import.meta.url));
};
export default loadApk;

export const loadPatchedApk = (version: PatchedVersion): Promise<string> =>
    loadApk("patched", version as PatchedVersion);
export const loadApkFromApkpure = (version: ApkpureVersion): Promise<string> =>
    loadApk("apkpure", version as TinyTowerApkVersion);
export const loadApkFromApkmirror = (version: ApkmirrorVersion): Promise<string> =>
    loadApk("apkmirror", version as TinyTowerApkVersion);

#!/usr/bin/env python3

import os
import functools


def getVersions(root = os.path.dirname(__file__), versions = []):
    for root, dirs, files in os.walk(root):
        for file_name in files:
            if (not file_name.startswith("v")):
                continue

            version = file_name[1:-4]
            if (version not in versions):
                versions.append(version)

        for dir in dirs:
            getVersions(dir, versions)

    return versions


def compareVersions(version1, version2):
    parts1 = version1.split(".")
    parts2 = version2.split(".")

    major1 = int(parts1[0])
    minor1 = int(parts1[1])
    patch1 = int(parts1[2])

    major2 = int(parts2[0])
    minor2 = int(parts2[1])
    patch2 = int(parts2[2])

    if (major1 > major2):
        return 1
    elif (major1 < major2):
        return -1

    if (minor1 > minor2):
        return 1
    elif (minor1 < minor2):
        return -1

    if (patch1 > patch2):
        return 1
    elif (patch1 < patch2):
        return -1

    return 0


versions = getVersions()
versions.sort(key=functools.cmp_to_key(compareVersions))
allVersions = ", ".join(map(lambda version: "\"" + version + "\"", versions))
print("export const TinyTowerApkVersions = [" + allVersions + "] as const;")
print("export type TinyTowerApkVersion = typeof TinyTowerApkVersions[number];")

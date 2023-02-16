#!/usr/bin/env python3

import os
import re
import functools


regex = re.compile(r"([\d]+.[\d]+.[\d]+)", re.RegexFlag.MULTILINE)


def getVersions(root):
    versions = []

    for _root, _dirs, files in os.walk(root):
        for file_name in files:
            version = re.search(regex, file_name)
            if (version is not None and version[1] not in versions):
                versions.append(version[1])

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


apkpureVersions = getVersions(os.path.join(os.path.dirname(__file__), "apkpure"))
apkpureVersions.sort(key=functools.cmp_to_key(compareVersions))
allApkpureVersions = ", ".join(map(lambda version: "\"" + version + "\"", apkpureVersions))
print("export const ApkpureVersions = [" + allApkpureVersions + "] as const;\n")

apkmirrorVersions = getVersions(os.path.join(os.path.dirname(__file__), "apkmirror"))
apkmirrorVersions.sort(key=functools.cmp_to_key(compareVersions))
allApkmirrorVersions = ", ".join(map(lambda version: "\"" + version + "\"", apkmirrorVersions))
print("export const ApkmirrorVersions = [" + allApkmirrorVersions + "] as const;\n")

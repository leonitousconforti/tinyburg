#!/usr/bin/env python3

import functools
import os
import re

version_regex = re.compile(r"([\d]+.[\d]+.[\d]+)", re.RegexFlag.MULTILINE)


def get_versions(root: str, use_parsed_version=True):
    versions = []

    for _root, _dirs, files in os.walk(root):
        for file_name in files:
            version = re.search(version_regex, file_name)
            if version is not None and version[1] not in versions:
                if use_parsed_version:
                    versions.append(version[1])
                else:
                    versions.append(file_name.replace(".apk", ""))

    return versions


def compare_versions(version1: str, version2: str):
    parts1 = version1.split(".")
    parts2 = version2.split(".")

    major1 = int(parts1[0])
    minor1 = int(parts1[1])
    patch1 = int(parts1[2])

    major2 = int(parts2[0])
    minor2 = int(parts2[1])
    patch2 = int(parts2[2])

    if major1 > major2:
        return 1
    elif major1 < major2:
        return -1

    if minor1 > minor2:
        return 1
    elif minor1 < minor2:
        return -1

    if patch1 > patch2:
        return 1
    elif patch1 < patch2:
        return -1

    return 0


make_version_typescript_safe = lambda version: '"' + version + '"'

apkpureVersions = get_versions(os.path.join(os.path.dirname(__file__), "apkpure"))
apkpureVersions.sort(key=functools.cmp_to_key(compare_versions))
allApkpureVersions = ", ".join(map(make_version_typescript_safe, apkpureVersions))
apkpureVersionsType = f"export const ApkpureVersions = [{allApkpureVersions}] as const;"

apkmirrorVersions = get_versions(os.path.join(os.path.dirname(__file__), "apkmirror"))
apkmirrorVersions.sort(key=functools.cmp_to_key(compare_versions))
allApkmirrorVersions = ", ".join(map(make_version_typescript_safe, apkmirrorVersions))
apkmirrorVersionsType = (
    f"export const ApkmirrorVersions = [{allApkmirrorVersions}] as const;"
)

patchedVersions = get_versions(
    os.path.join(os.path.dirname(__file__), "patched"), use_parsed_version=False
)
allPatchedVersions = ", ".join(map(make_version_typescript_safe, patchedVersions))
patchedVersionsType = f"export const PatchedVersions = [{allPatchedVersions}] as const;"


filedata: str = ""
with open(os.path.join(os.path.dirname(__file__), "..", "index.ts"), "r") as file:
    filedata = file.read()

filedata = re.sub(r"export const ApkpureVersions.*", apkpureVersionsType, filedata)
filedata = re.sub(r"export const PatchedVersions.*", patchedVersionsType, filedata)
filedata = re.sub(r"export const ApkmirrorVersions.*", apkmirrorVersionsType, filedata)

with open(os.path.join(os.path.dirname(__file__), "..", "index.ts"), "w") as file:
    file.write(filedata)

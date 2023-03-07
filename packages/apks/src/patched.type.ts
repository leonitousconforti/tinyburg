// eslint-disable-next-line @rushstack/typedef-var
export const PatchedVersions = [
    "apkpure-3.15.0-with-x86_64-frida-gadget",
    "apkpure-4.14.0-with-arm64-frida-gadget",
    "apkpure-4.14.0-with-x86_64-frida-gadget",
] as const;

export type PatchedVersion = typeof PatchedVersions[number];

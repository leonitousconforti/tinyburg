export const bundleIdentifiers = [
    "com.nimblebit.tinytower",
    "com.nimblebit.vegas",
    "com.nimblebit.pocketplanes",
    "com.nimblebit.pockettrains",
    "com.nimblebit.pockettrucks",
] as const;

export type BundleIdentifier = (typeof bundleIdentifiers)[number];

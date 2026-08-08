// Nimblebit games we want to support with sdks. Tiny Tower Classic is
// iOS-only (no Google Play listing), so it cannot be archived from here.
export const bundleIdentifiers = [
    "com.nimblebit.tinytower", // tinytower-sdk
    "com.nimblebit.vegas", // tinytower-vegas-sdk
    "com.nimblebit.pocketplanes", // pocket-planes-sdk
    "com.nimblebit.pockettrains", // pocket-trains-sdk
    "com.nimblebit.pockettrucks", // pocket-trucks-sdk
] as const;

export type BundleIdentifier = (typeof bundleIdentifiers)[number];

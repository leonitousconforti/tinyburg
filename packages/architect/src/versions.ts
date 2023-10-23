/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable unicorn/numeric-separators-style */

/** https://github.com/frida/frida/releases */
export const FRIDA_SERVER_VERSION = "16.1.4" as const;

/** https://github.com/envoyproxy/envoy/releases */
export const ENVOY_PROXY_VERSION = "1.28.0" as const;

/** https://developer.android.com/studio/releases/platform-tools */
export const SDK_TOOLS_VERSION = "34.0.5" as const;

/** https://developer.android.com/studio/emulator_archive */
export const EMULATOR_VERSION = "10696886" as const;

/** https://dl.google.com/android/repository/sys-img/google_apis/x86_64-30_r12.zip */
export const EMULATOR_SYSTEM_IMAGE_VERSION = "google_apis/x86_64-30_r12" as const;
export const EMULATOR_SYSTEM_IMAGE_VERSION_SHORT = EMULATOR_SYSTEM_IMAGE_VERSION.split("/")[1] as string;

export const DOCKER_IMAGE_TAG =
    `ghcr.io/leonitousconforti/tinyburg/architect:emulator-${EMULATOR_VERSION}_sdk-${SDK_TOOLS_VERSION}_frida-${FRIDA_SERVER_VERSION}_envoy-${ENVOY_PROXY_VERSION}` as const;

/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable unicorn/numeric-separators-style */

/** https://github.com/mitmproxy/mitmproxy/releases */
export const MITM_PROXY_VERSION = "10.1.1" as const;

/** https://github.com/frida/frida/releases */
export const FRIDA_SERVER_VERSION = "16.1.4" as const;

/** https://github.com/envoyproxy/envoy/releases */
export const ENVOY_PROXY_VERSION = "1.28.0" as const;

/** https://developer.android.com/tools/releases/platform-tools */
export const SDK_TOOLS_VERSION = "34.0.5" as const;

/** https://developer.android.com/studio/emulator_archive */
export const EMULATOR_VERSION = "10696886" as const;

/** https://dl.google.com/android/repository/sys-img/google_apis/x86_64-30_r12.zip */
export const EMULATOR_SYSTEM_IMAGE_VERSION = "google_apis/x86_64-30_r12" as const;
export const EMULATOR_SYSTEM_IMAGE_VERSION_SHORT = EMULATOR_SYSTEM_IMAGE_VERSION.split("/")[1] as string;

/** Combines all the versions to form a unique tag. */
export const UNIQUE_VERSION_TAG =
    `emulator-${EMULATOR_VERSION}_sdk-${SDK_TOOLS_VERSION}_frida-${FRIDA_SERVER_VERSION}_envoy-${ENVOY_PROXY_VERSION}_mitm-${MITM_PROXY_VERSION}` as const;

/** The name of the docker volume that stores the emulator boot state. */
export const SHARED_EMULATOR_DATA_VOLUME_NAME = `architectEmulatorData_${UNIQUE_VERSION_TAG}` as const;

/** The name of the container that will be populating the shared volume. */
export const SHARED_VOLUME_CONTAINER_HELPER_NAME = `architectVolumeHelper_${UNIQUE_VERSION_TAG}` as const;

/** The tag to use for the docker image once it is build. */
export const DOCKER_IMAGE_TAG = `ghcr.io/leonitousconforti/tinyburg/architect:${UNIQUE_VERSION_TAG}` as const;

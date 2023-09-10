/* eslint-disable @rushstack/typedef-var */
/* eslint-disable unicorn/numeric-separators-style */

export const FRIDA_VERSION = "16.0.19" as const;
export const EMULATOR_BUILD_VERSION = 10410302 as const;
export const EMULATOR_SYSTEM_IMAGE_VERSION = "sys-30-google-apis-x64-r12" as const;

export const DOCKER_IMAGE_TAG =
    `ghcr.io/leonitousconforti/tinyburg/architect:emulator-${EMULATOR_BUILD_VERSION}_${EMULATOR_SYSTEM_IMAGE_VERSION}_frida-${FRIDA_VERSION}` as const;

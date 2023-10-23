/* eslint-disable @typescript-eslint/typedef */

import { EMULATOR_VERSION, SDK_TOOLS_VERSION, ENVOY_PROXY_VERSION, FRIDA_SERVER_VERSION } from "./versions.js";

/** The name of the docker volume that stores the emulator boot state. */
export const SHARED_EMULATOR_DATA_VOLUME_NAME =
    `architectEmulatorData_emulator-${EMULATOR_VERSION}_sdk-${SDK_TOOLS_VERSION}_frida-${FRIDA_SERVER_VERSION}_envoy-${ENVOY_PROXY_VERSION}` as const;

/** The name of the container that will be populating the shared volume. */
export const SHARED_VOLUME_CONTAINER_HELPER_NAME =
    `architectVolumeHelper_emulator-${EMULATOR_VERSION}_sdk-${SDK_TOOLS_VERSION}_frida-${FRIDA_SERVER_VERSION}_envoy-${ENVOY_PROXY_VERSION}` as const;

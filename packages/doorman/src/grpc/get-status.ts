import type { ServiceError } from "@grpc/grpc-js";
import type { EmulatorStatus__Output } from "../../proto/generated/android/emulation/control/EmulatorStatus.js";
import type { EmulatorControllerClient } from "../../proto/generated/android/emulation/control/EmulatorController.js";

import assert from "node:assert";

export const getStatus = (client: EmulatorControllerClient): Promise<EmulatorStatus__Output> =>
    new Promise((resolve, reject) => {
        client.getStatus({}, function (error: ServiceError | null, data: EmulatorStatus__Output | undefined) {
            if (error) return reject(error);
            assert(data);
            return resolve(data);
        });
    });

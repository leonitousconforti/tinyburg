import type { EmulatorStatus } from "@tinyburg/architect/protobuf/emulator_controller.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import assert from "node:assert";

export const getStatus = async (client: EmulatorControllerClient): Promise<EmulatorStatus> => {
    const data = await client.getStatus({}).response;
    assert(data);
    return data;
};

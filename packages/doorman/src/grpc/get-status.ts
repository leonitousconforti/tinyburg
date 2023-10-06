import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorStatus } from "@tinyburg/architect/protobuf/emulator_controller_pb.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import assert from "node:assert";

export const getStatus = async (client: PromiseClient<typeof EmulatorController>): Promise<EmulatorStatus> => {
    const data = await client.getStatus({});
    assert(data);
    return data;
};

import type { PromiseClient } from "@connectrpc/connect";

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

// Create a client and increase the default max message size to handle large screenshots
export const createEmulatorControllerClient = (address: string): PromiseClient<typeof EmulatorController> => {
    const transport = createGrpcTransport({ baseUrl: address, httpVersion: "2" });
    return createPromiseClient(EmulatorController, transport);
};

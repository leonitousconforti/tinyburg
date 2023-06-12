import type { ClientOptions } from "@grpc/grpc-js";

import { ChannelCredentials } from "@grpc/grpc-js";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

// Create a client and increase the default max message size to handle large screenshots
export const createEmulatorControllerClient = (
    address: string,
    credentials: ChannelCredentials = ChannelCredentials.createInsecure(),
    options?: ClientOptions
) => {
    const transport = new GrpcTransport({
        host: address,
        channelCredentials: credentials,
        clientOptions: {
            ...options,
            "grpc.max_receive_message_length": 12 * 1024 * 1024,
        },
    });
    return new EmulatorControllerClient(transport);
};

import path from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

// Generated types from the protobuf file
import type { ProtoGrpcType } from "../../proto/generated/emulator_controller.js";
import type { EmulatorControllerClient } from "../../proto/generated/android/emulation/control/EmulatorController.js";

// Load the protobuf file into grpc-js
const protoFilePath: string = path.fileURLToPath(new URL("../../proto/emulator_controller.proto", import.meta.url));
const packageDefinition: protoLoader.PackageDefinition = await protoLoader.load(protoFilePath);
const packageObject: ProtoGrpcType = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

// Create a client and increase the default max message size to handle large screenshots
export const createEmulatorControllerClient = (
    address: string,
    credentials: grpc.ChannelCredentials = grpc.credentials.createInsecure(),
    options?: grpc.ClientOptions
): EmulatorControllerClient =>
    new packageObject.android.emulation.control.EmulatorController(address, credentials, {
        "grpc.max_receive_message_length": 12 * 1024 * 1024,
        ...options,
    });

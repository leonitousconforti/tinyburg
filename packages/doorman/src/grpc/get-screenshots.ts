import type { Image } from "../image-operations/image.js";
import type { Rotation, ImageTransport, ImageFormat } from "@tinyburg/architect/protobuf/emulator_controller.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import assert from "node:assert";
import { ImageType } from "../image-operations/image.js";
import {
    DisplayModeValue,
    ImageFormat_ImgFormat,
    Rotation_SkinRotation,
    ImageTransport_TransportChannel,
} from "@tinyburg/architect/protobuf/emulator_controller.js";

// Default screenshot request params
const defaultScreenshotRequest: ImageFormat = {
    // Three channel RGB format
    format: ImageFormat_ImgFormat.RGB888,

    // No rotation
    rotation: {
        rotation: Rotation_SkinRotation.PORTRAIT,
    } as Rotation,

    // Use the width and height of the display
    width: 0,
    height: 0,

    // Use the main display
    display: 0,

    // Transport the image as a raw buffer
    transport: {
        channel: ImageTransport_TransportChannel.TRANSPORT_CHANNEL_UNSPECIFIED,
    } as ImageTransport,

    // Ignore display mode because AVD is not re-sizeable
    displayMode: DisplayModeValue.PHONE,
};

export const getScreenshot = async (
    emulatorControllerClient: EmulatorControllerClient,
    requestOptions = defaultScreenshotRequest
): Promise<Image> => {
    const image = await emulatorControllerClient.getScreenshot(requestOptions).response;

    assert(image);
    assert(image.image);
    assert(image.format);
    assert(image.format.width);
    assert(image.format.height);
    assert(image.format.format);

    return {
        pixels: image.image,
        width: image.format.width,
        height: image.format.height,
        channels: image.format.format === ImageFormat_ImgFormat.RGB888 ? 3 : 4,
        format: image.format.format === ImageFormat_ImgFormat.RGB888 ? ImageType.RGB : ImageType.RGB_A,
    };
};

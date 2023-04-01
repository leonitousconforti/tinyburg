import * as base64 from "byte-base64";
import React, { useEffect, useState } from "react";
import { useResizeDetector } from "react-resize-detector";

import { ImageFormat, ImageFormat_ImgFormat } from "../generated/emulator_controller";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

interface PngViewProps {
    emulatorClient: IEmulatorControllerClient;
}

export const PngView: React.FunctionComponent<PngViewProps> = ({ emulatorClient }) => {
    const [png, setPng] = useState("");
    const { width, height, ref } = useResizeDetector();

    const startStream = () => {
        const request = ImageFormat.create();
        request.display = 0;
        request.width = Math.floor(width!);
        request.height = Math.floor(height!);
        request.format = ImageFormat_ImgFormat.PNG;

        const screenshotStream = emulatorClient.streamScreenshot(request).responses;
        screenshotStream.onError((reason: Error) => console.warn("Screenshot stream broken", reason));
        screenshotStream.onMessage((response) => {
            const b64encoded = base64.bytesToBase64(response.image);
            setPng("data:image/jpeg;base64," + b64encoded);
        });
    };

    useEffect(() => {
        if (!width || !height) return;
        startStream();
    }, [emulatorClient, width, height]);

    return (
        <div
            ref={ref}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                position: "relative",
                objectFit: "contain",
                objectPosition: "center",
            }}
            onDragStart={(event: React.DragEvent) => event.preventDefault()}
        >
            <img src={png} width="100%" draggable="false" style={{ pointerEvents: "none" }} />
        </div>
    );
};

export default PngView;

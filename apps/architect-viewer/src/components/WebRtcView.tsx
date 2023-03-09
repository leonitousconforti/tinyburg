import type { IRtcClient } from "../generated/rtc_service.client";

import JsepProtocol from "../service/Jsep2";
import React, { useEffect, useRef } from "react";

export interface WebRtcViewProps {
    rtcClient: IRtcClient;
}

export const WebRtcView: React.FunctionComponent<WebRtcViewProps> = ({ rtcClient }) => {
    const video = useRef<HTMLVideoElement>(undefined!);

    const onTrack = (track: MediaStreamTrack) => {
        console.log(track);
        if (!video.current.srcObject) {
            video.current.srcObject = new MediaStream();
        }
        (video.current.srcObject as MediaStream).addTrack(track);
    };

    useEffect(() => {
        const jsep = new JsepProtocol(rtcClient);
        jsep.startStream();
        jsep.on("connected", onTrack);
        jsep.on("disconnected", () => console.log("here"));
    }, []);

    return (
        <video
            autoPlay
            ref={video}
            style={{
                display: "block",
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
            }}
            onContextMenu={(event) => event.preventDefault()}
        />
    );
};

export default WebRtcView;

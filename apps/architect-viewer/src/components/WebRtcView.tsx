import type { IRtcClient } from "../generated/rtc_service.client";

import JsepProtocol from "../service/Jsep2";
import React, { useEffect, useReducer, useRef } from "react";

export interface WebRtcViewProps {
    rtcClient: IRtcClient;
}

export const WebRtcView: React.FunctionComponent<WebRtcViewProps> = ({ rtcClient }) => {
    const video = useRef<HTMLVideoElement>(undefined!);
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    const onTrack = (track: MediaStreamTrack) => {
        console.log(track);
        console.log(track.getSettings());
        if (!video.current.srcObject) {
            video.current.srcObject = new MediaStream();
        }
        (video.current.srcObject as MediaStream).addTrack(track);
        forceUpdate();
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

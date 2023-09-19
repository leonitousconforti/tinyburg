import type React from "react";
import type JsepProtocol from "../services/Jsep.js";

import { useEffect, useRef } from "react";

interface IWebRtcViewProps {
    muted: boolean;
    volume: number;
    jsep: JsepProtocol;
}

export const WebRtcView: React.FunctionComponent<IWebRtcViewProps> = ({ jsep, muted, volume = 1 }) => {
    const video = useRef<HTMLVideoElement>(null);

    const onTrack = (track: MediaStreamTrack): void => {
        console.log(track);
        if (!video.current) return;
        if (!video.current?.srcObject) video.current.srcObject = new MediaStream();
        (video.current.srcObject as MediaStream).addTrack(track);
    };

    useEffect(() => {
        jsep.startStream(onTrack).catch((error) => console.error(error));
    }, [jsep]);

    useEffect(() => {
        if (!video.current) return;
        video.current.volume = volume;
    }, [volume]);

    return (
        <video
            autoPlay
            muted={muted}
            ref={video}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                position: "relative",
                objectFit: "contain",
                objectPosition: "center",
            }}
            onContextMenu={(event) => event.preventDefault()}
        />
    );
};

export default WebRtcView;

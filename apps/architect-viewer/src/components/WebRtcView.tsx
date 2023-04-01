import React, { useEffect, useRef } from "react";

import type JsepProtocol from "../service/Jsep";

interface WebRtcViewProps {
    muted: boolean;
    volume: number;
    jsep: JsepProtocol;
}

export const WebRtcView: React.FunctionComponent<WebRtcViewProps> = ({ jsep, muted, volume = 1.0 }) => {
    const video = useRef<HTMLVideoElement>(null);

    const onTrack = (track: MediaStreamTrack) => {
        console.log(track);
        if (!video.current) return;
        if (!video.current?.srcObject) video.current.srcObject = new MediaStream();
        (video.current.srcObject as MediaStream).addTrack(track);
    };

    useEffect(() => {
        console.log("here");
        jsep.startStream(onTrack);
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

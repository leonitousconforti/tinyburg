import type { RtcId } from "../generated/rtc_service";
import type { IRtcClient } from "../generated/rtc_service.client";
import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";

import { JsepMsg } from "../generated/rtc_service";

export default class JsepProtocol {
    private readonly rtcClient: IRtcClient;

    private rtcId: RtcId | undefined = undefined;
    private onTrack: (event: RTCTrackEvent) => unknown;
    private jsepStream: ServerStreamingCall<RtcId, JsepMsg> | undefined = undefined;

    constructor(rtcClient: IRtcClient, onTrack: (event: RTCTrackEvent) => unknown) {
        this.rtcClient = rtcClient;
        this.onTrack = onTrack;
    }

    public startStream = async () => {
        this.rtcId = await this.rtcClient.requestRtcStream({}).response;
        this.jsepStream = this.rtcClient.receiveJsepMessages(this.rtcId);

        for await (const response of this.jsepStream.responses) {
            const signal = JSON.parse(response.message);

            if (signal.start) {
                const peerConnection = new RTCPeerConnection(signal.start);
                peerConnection.ontrack = this.onTrack;
                // peerConnection.onsignalingstatechange = this.handlePeerState;
                // peerConnection.onconnectionstatechange = this.handlePeerConnectionStateChange;
                peerConnection.onicecandidate = ({ candidate }) => {
                    if (candidate !== null) this.sendJsep({ candidate });
                };
            }
        }
    };

    private sendJsep = async (json: any) => {
        const request = JsepMsg.create();
        request.id = this.rtcId!;
        request.message = JSON.stringify(json);
        await this.rtcClient.sendJsepMessage(request);
    };
}

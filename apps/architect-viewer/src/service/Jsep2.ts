import type { RtcId } from "../generated/rtc_service";
import type { IRtcClient } from "../generated/rtc_service.client";

import { EventEmitter } from "events";
import { JsepMsg } from "../generated/rtc_service";

export default class JsepProtocol extends EventEmitter {
    private readonly rtcClient: IRtcClient;

    // private haveOffer: boolean;
    private candidates: RTCIceCandidateInit[];
    private peerConnection: RTCPeerConnection | undefined;

    constructor(rtcClient: IRtcClient) {
        super();
        this.rtcClient = rtcClient;

        this.candidates = [];
        // this.haveOffer = false;
        this.peerConnection = undefined;
    }

    disconnect = () => {
        this.candidates = [];
        // this.haveOffer = false;
        this.peerConnection?.close();
        this.emit("disconnected");
    };

    startStream = async () => {
        const rtcId: RtcId = await this.rtcClient.requestRtcStream({}).response;
        const jsepStream = this.rtcClient.receiveJsepMessages(rtcId);

        for await (const response of jsepStream.responses) {
            const signal = JSON.parse(response.message);

            if (signal.start) {
                this.peerConnection = new RTCPeerConnection(signal.start);
                this.peerConnection.ontrack = this.handlePeerConnectionTrack;
                this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                    if (event.candidate === null) return;
                    this.sendJsep(rtcId, { candidate: event.candidate });
                };
                this.peerConnection.onsignalingstatechange = this._handlePeerState;
                this.peerConnection.onconnectionstatechange = this._handlePeerConnectionStateChange;
            }

            if (signal.bye) {
                this.disconnect();
            }

            if (signal.sdp) {
                this.peerConnection?.setRemoteDescription(
                    new RTCSessionDescription(signal as RTCSessionDescriptionInit)
                );
                const answer = await this.peerConnection?.createAnswer();
                this.peerConnection?.setLocalDescription(answer);
                this.sendJsep(rtcId, { sdp: answer });
            }

            if (signal.candidate) {
                this.candidates.push(signal);
            }

            // if (this.peerConnection) {
            //     if (this.haveOffer) {
            //         console.log("here!");
            //         while (this.candidates.length > 0) {
            //             console.log("Here!!");
            //             this.handleCandidate(this.candidates.shift()!);
            //         }
            //     }
            // }
        }
    };

    private handlePeerConnectionTrack = (event: RTCTrackEvent) => {
        this.emit("connected", event.track);
    };

    _handlePeerConnectionStateChange = () => {
        switch (this.peerConnection?.connectionState) {
            case "disconnected":
            case "failed":
            case "closed":
                this.disconnect();
        }
    };

    _handlePeerState = () => {
        if (!this.peerConnection) {
            console.log("Peerconnection no longer available, ignoring signal state.");
        }
        switch (this.peerConnection?.signalingState) {
            case "have-remote-offer":
                // this.haveOffer = true;
                while (this.candidates.length > 0) {
                    this.handleCandidate(this.candidates.shift()!);
                }
                break;
        }
    };

    private handleCandidate = (candidateInitDict?: RTCIceCandidateInit) => {
        this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidateInitDict));
    };

    private sendJsep = async (rtcId: RtcId, jsonObject: any) => {
        const request = JsepMsg.create();
        request.id = rtcId;
        request.message = JSON.stringify(jsonObject);
        await this.rtcClient.sendJsepMessage(request);
    };
}

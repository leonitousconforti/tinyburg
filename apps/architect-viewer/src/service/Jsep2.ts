import type { RtcId } from "../generated/rtc_service";
import type { IRtcClient } from "../generated/rtc_service.client";

import { EventEmitter } from "events";
import { JsepMsg } from "../generated/rtc_service";

export default class JsepProtocol extends EventEmitter {
    private rtcId: RtcId | undefined;
    private readonly rtcClient: IRtcClient;
    private peerConnection: RTCPeerConnection | undefined;
    private old_emu_patch: {
        candidates: unknown[];
        sdp: unknown;
        haveOffer: boolean;
        answer: boolean;
    };

    constructor(rtcClient: IRtcClient) {
        super();

        this.rtcId = undefined;
        this.rtcClient = rtcClient;
        this.peerConnection = undefined;

        this.old_emu_patch = {
            candidates: [],
            sdp: null,
            haveOffer: false,
            answer: false,
        };
    }

    disconnect = () => {
        if (this.peerConnection) this.peerConnection.close();
        this.old_emu_patch = {
            candidates: [],
            sdp: null,
            haveOffer: false,
            answer: false,
        };
        this.emit("disconnected", this);
    };

    startStream = async () => {
        this.rtcId = await this.rtcClient.requestRtcStream({}).response;
        const stream = this.rtcClient.receiveJsepMessages(this.rtcId);
        for await (const response of stream.responses) {
            const msg = response.message;
            const signal = JSON.parse(msg);
            this._handleSignal(signal);
        }
    };

    cleanup = () => {
        this.disconnect();
        if (this.peerConnection) {
            this.peerConnection.removeEventListener("track", this._handlePeerConnectionTrack);
            this.peerConnection.removeEventListener("icecandidate", this._handlePeerIceCandidate);
            this.peerConnection = undefined;
        }
    };

    _handlePeerConnectionTrack = (event: RTCTrackEvent) => {
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

    _handlePeerIceCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate === null) return;
        this._sendJsep({ candidate: event.candidate });
    };

    _handleStart = (signal: any) => {
        this.peerConnection = new RTCPeerConnection(signal.start);
        this.peerConnection.ontrack = this._handlePeerConnectionTrack;
        this.peerConnection.onicecandidate = this._handlePeerIceCandidate;
        this.peerConnection.onconnectionstatechange = this._handlePeerConnectionStateChange;
        this.peerConnection.onsignalingstatechange = this._handlePeerState;
    };

    _handlePeerState = () => {
        if (!this.peerConnection) {
            console.log("Peerconnection no longer available, ignoring signal state.");
        }
        switch (this.peerConnection?.signalingState) {
            case "have-remote-offer":
                this.old_emu_patch.haveOffer = true;
                while (this.old_emu_patch.candidates.length > 0) {
                    this._handleCandidate(this.old_emu_patch.candidates.shift());
                }
                break;
        }
    };

    _handleSDP = async (signal: any) => {
        this.old_emu_patch.sdp = null;
        this.peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await this.peerConnection?.createAnswer();
        if (answer) {
            if (!this.old_emu_patch.answer) {
                this.old_emu_patch.answer = true;
                this.peerConnection?.setLocalDescription(answer);
                this._sendJsep({ sdp: answer });
            }
        } else {
            this.disconnect();
        }
    };

    _handleCandidate = (signal: any) => {
        this.peerConnection?.addIceCandidate(new RTCIceCandidate(signal));
    };

    _handleSignal = (signal: any) => {
        console.log(signal);
        if (signal.start) {
            this._handleStart(signal);
        }
        if (signal.bye) {
            this._handleBye();
        }
        if (signal.sdp && !this.old_emu_patch.sdp) {
            this.old_emu_patch.sdp = signal;
        }
        if (signal.candidate) {
            this.old_emu_patch.candidates.push(signal);
        }

        if (!!this.peerConnection) {
            // We have created a peer connection..
            if (this.old_emu_patch.sdp) {
                this._handleSDP(this.old_emu_patch.sdp);
            }

            if (this.old_emu_patch.haveOffer) {
                while (this.old_emu_patch.candidates.length > 0) {
                    this._handleCandidate(this.old_emu_patch.candidates.shift());
                }
            }
        }
    };

    _handleBye = () => {
        this.disconnect();
    };

    _sendJsep = async (jsonObject: any) => {
        const request = JsepMsg.create();
        request.id = this.rtcId!;
        request.message = JSON.stringify(jsonObject);
        await this.rtcClient.sendJsepMessage(request);
    };
}

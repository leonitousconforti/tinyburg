import type { RtcId } from "../generated/rtc_service";
import type { IRtcClient } from "../generated/rtc_service.client";
import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";

import { JsepMsg } from "../generated/rtc_service";
import { KeyboardEvent, MouseEvent, TouchEvent } from "../generated/emulator_controller";

export default class JsepProtocol {
    private readonly rtcClient: IRtcClient;
    private readonly onDisconnected: () => void;

    private eventForwarders: Record<string, RTCDataChannel> = {};

    constructor(rtcServiceClient: IRtcClient, onDisconnected: () => void = () => {}) {
        this.rtcClient = rtcServiceClient;
        this.onDisconnected = onDisconnected;
    }

    public startStream = async (onMediaTrack: (event: MediaStreamTrack) => void) => {
        const rtcId: RtcId = await this.rtcClient.requestRtcStream({}).response;
        const jsepStream: ServerStreamingCall<RtcId, JsepMsg> = this.rtcClient.receiveJsepMessages(rtcId);

        let candidates: RTCIceCandidateInit[] = [];
        let peerConnection: RTCPeerConnection | undefined;

        for await (const response of jsepStream.responses) {
            const signal = JSON.parse(response.message);

            /**
             * An RTCConfiguration dictionary providing options to configure the
             * new connection. This can include the turn configuration the serve
             * is using. This dictionary can be passed in directly to the
             * RTCPeerConnection object.
             */
            if (signal.start) {
                peerConnection = new RTCPeerConnection(signal.start as RTCConfiguration);
                peerConnection.ontrack = (event: RTCTrackEvent) => onMediaTrack(event.track);
                peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                    if (!event.candidate) return;
                    this.sendJsep(rtcId, { candidate: event.candidate });
                };
                peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
                    this.eventForwarders[event.channel.label] = event.channel;
                };
            }

            /**
             * You can hang up now. No new message expected for you. The server
             * has stopped the RTC stream.
             */
            if (signal.bye) {
                candidates = [];
                peerConnection?.close();
                this.eventForwarders = {};
                this.onDisconnected();
            }

            /**
             * RTCSessionDescriptionInit dictionary containing the values to
             * that can be assigned to a RTCSessionDescription
             */
            if (signal.sdp) {
                peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerConnection?.createAnswer();
                peerConnection?.setLocalDescription(answer);
                this.sendJsep(rtcId, { sdp: answer });
            }

            /**
             * The WebRTC API's RTCIceCandidateInit dictionary, which contains
             * the information needed to fundamentally describe an
             * RTCIceCandidate. See RTCIceCandidate and Session Lifetime for
             * more details.
             */
            if (signal.candidate) {
                candidates.push(signal);
            }
        }
    };

    public sendMouse = (message: MouseEvent) => this.sendBytes("mouse", MouseEvent.toBinary(message));
    public sendTouch = (message: TouchEvent) => this.sendBytes("touch", TouchEvent.toBinary(message));
    public sendKeyboard = (message: KeyboardEvent) => this.sendBytes("keyboard", KeyboardEvent.toBinary(message));

    public sendBytes = (label: "mouse" | "keyboard" | "touch", bytes: Uint8Array) => {
        let forwarder = this.eventForwarders[label];
        if (forwarder && forwarder.readyState === "open") {
            forwarder.send(bytes);
        }
    };

    private sendJsep = async (rtcId: RtcId, jsonObject: Record<string, unknown>) => {
        const request = JsepMsg.create();
        request.id = rtcId;
        request.message = JSON.stringify(jsonObject);
        await this.rtcClient.sendJsepMessage(request);
    };
}

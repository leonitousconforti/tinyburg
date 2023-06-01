import type { RtcId } from "../generated/rtc_service.js";
import type { IRtcClient } from "../generated/rtc_service.client.js";
import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";

import { JsepMsg } from "../generated/rtc_service.js";
import { KeyboardEvent, MouseEvent, TouchEvent } from "../generated/emulator_controller.js";

export default class JsepProtocol {
    private readonly _rtcClient: IRtcClient;
    private readonly _onDisconnected: () => void;

    private _eventForwarders: Record<string, RTCDataChannel> = {};

    public constructor(rtcServiceClient: IRtcClient, onDisconnected: () => void = () => {}) {
        this._rtcClient = rtcServiceClient;
        this._onDisconnected = onDisconnected;
    }

    public startStream = async (onMediaTrack: (event: MediaStreamTrack) => void): Promise<void> => {
        const rtcId: RtcId = await this._rtcClient.requestRtcStream({}).response;
        const jsepStream: ServerStreamingCall<RtcId, JsepMsg> = this._rtcClient.receiveJsepMessages(rtcId);

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
                peerConnection.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
                    if (!event.candidate) return;
                    await this._sendJsep(rtcId, { candidate: event.candidate });
                };
                peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
                    this._eventForwarders[event.channel.label] = event.channel;
                };
            }

            /**
             * You can hang up now. No new message expected for you. The server
             * has stopped the RTC stream.
             */
            if (signal.bye) {
                candidates = [];
                peerConnection?.close();
                this._eventForwarders = {};
                this._onDisconnected();
            }

            /**
             * RTCSessionDescriptionInit dictionary containing the values to
             * that can be assigned to a RTCSessionDescription
             */
            if (signal.sdp) {
                await peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerConnection?.createAnswer();
                await peerConnection?.setLocalDescription(answer);
                await this._sendJsep(rtcId, { sdp: answer });
            }

            /**
             * The WebRTC API's RTCIceCandidateInit dictionary, which contains
             * the information needed to fundamentally describe an
             * RTCIceCandidate.
             */
            if (signal.candidate) {
                candidates.push(signal);
            }
        }
    };

    public sendMouse = (message: MouseEvent): void => this.sendBytes("mouse", MouseEvent.toBinary(message));
    public sendTouch = (message: TouchEvent): void => this.sendBytes("touch", TouchEvent.toBinary(message));
    public sendKeyboard = (message: KeyboardEvent): void => this.sendBytes("keyboard", KeyboardEvent.toBinary(message));

    public sendBytes = (label: "mouse" | "keyboard" | "touch", bytes: Uint8Array): void => {
        const forwarder = this._eventForwarders[label];
        if (forwarder && forwarder.readyState === "open") {
            forwarder.send(bytes);
        }
    };

    private _sendJsep = async (rtcId: RtcId, jsonObject: Record<string, unknown>): Promise<void> => {
        const request = JsepMsg.create();
        request.id = rtcId;
        request.message = JSON.stringify(jsonObject);
        await this._rtcClient.sendJsepMessage(request);
    };
}

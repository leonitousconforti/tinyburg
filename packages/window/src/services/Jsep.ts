import type { PromiseClient } from "@connectrpc/connect";
import type { Rtc } from "@tinyburg/architect/protobuf/rtc_service_connect";

import { JsepMsg, RtcId } from "@tinyburg/architect/protobuf/rtc_service_pb";
import { KeyboardEvent, MouseEvent, TouchEvent } from "@tinyburg/architect/protobuf/emulator_controller_pb";

// JavaScript Session Establishment Protocol
// https://rtcweb-wg.github.io/jsep
export class JsepProtocol {
    private readonly _onDisconnected: () => void;
    private readonly _rtcClient: PromiseClient<typeof Rtc>;
    private _eventForwarders: Record<string, RTCDataChannel> = {};

    public constructor(rtcServiceClient: PromiseClient<typeof Rtc>, onDisconnected: () => void = () => {}) {
        this._rtcClient = rtcServiceClient;
        this._onDisconnected = onDisconnected;
    }

    // https://rtcweb-wg.github.io/jsep/#sec.detailed-example
    public startStream = async (onMediaTrack: (event: MediaStreamTrack) => void): Promise<void> => {
        let peerConnection: RTCPeerConnection | undefined;
        const abortController = new AbortController();
        const rtcId: RtcId = await this._rtcClient.requestRtcStream({});
        const jsepStream: AsyncIterable<JsepMsg> = this._rtcClient.receiveJsepMessages(rtcId, {
            signal: abortController.signal,
        });

        for await (const response of jsepStream) {
            const signal = JSON.parse(response.message);
            console.log("signal: ", signal);

            /**
             * An RTCConfiguration dictionary providing options to configure the
             * new connection. This can include the turn configuration the serve
             * is using. This dictionary can be passed in directly to the
             * RTCPeerConnection object.
             */
            if (signal.start) {
                peerConnection = new RTCPeerConnection(signal.start as RTCConfiguration);
                peerConnection.ontrack = (event: RTCTrackEvent) => onMediaTrack(event.track);
                peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
                    this._eventForwarders[event.channel.label] = event.channel;
                };
                peerConnection.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
                    if (!event.candidate) return;
                    await this._sendJsep(rtcId, { candidate: event.candidate });
                    console.log("sent ice candidate: ", { candidate: event.candidate });
                };
            }

            /**
             * You can hang up now. No new message expected for you. The server
             * has stopped the RTC stream.
             */
            if (signal.bye) {
                abortController.abort();
                peerConnection?.close();
                this._eventForwarders = {};
                this._onDisconnected();
            }

            /**
             * RTCSessionDescriptionInit dictionary containing the values to
             * that can be assigned to a RTCSessionDescription
             */
            if (signal.sdp) {
                if (!peerConnection) {
                    throw new Error("peerConnection is not initialized from sdp signal");
                }

                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                await this._sendJsep(rtcId, { sdp: answer });
                console.log("sent sdp answer: ", { sdp: answer });
            }

            /**
             * The WebRTC API's RTCIceCandidateInit dictionary, which contains
             * the information needed to fundamentally describe an
             * RTCIceCandidate.
             */
            if (signal.candidate) {
                if (!peerConnection) {
                    throw new Error("peerConnection is not initialized from candidate signal");
                }
                await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
            }
        }
    };

    public sendMouse = (message: MouseEvent): void => this.sendBytes("mouse", message.toBinary());
    public sendTouch = (message: TouchEvent): void => this.sendBytes("touch", message.toBinary());
    public sendKeyboard = (message: KeyboardEvent): void => this.sendBytes("keyboard", message.toBinary());

    public sendBytes = (label: "mouse" | "keyboard" | "touch", bytes: Uint8Array): void => {
        const forwarder = this._eventForwarders[label];
        if (forwarder && forwarder.readyState === "open") {
            forwarder.send(bytes);
        }
    };

    private _sendJsep = async (rtcId: RtcId, jsonObject: Record<string, unknown>): Promise<void> => {
        const request = new JsepMsg({ id: rtcId, message: JSON.stringify(jsonObject) });
        await this._rtcClient.sendJsepMessage(request);
    };
}

export default JsepProtocol;

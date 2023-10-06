import type JsepProtocol from "../services/Jsep.js";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import {
    Touch,
    MouseEvent,
    TouchEvent,
    KeyboardEvent,
    KeyboardEvent_KeyEventType,
} from "@tinyburg/architect/protobuf/emulator_controller_pb.js";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface IWithMouseKeyHandlerProps extends React.PropsWithChildren {
    jsep: JsepProtocol;
    emulatorClient: PromiseClient<typeof EmulatorController>;
}

export const WithMouseKeyHandler: React.FunctionComponent<IWithMouseKeyHandlerProps> = ({
    jsep,
    emulatorClient,
    children,
}) => {
    const handle = useRef<HTMLDivElement>(undefined!);

    const [deviceWidth, setDeviceWidth] = useState(0);
    const [deviceHeight, setDeviceHeight] = useState(0);

    const [mouseDown, setMouseDown] = useState(false);

    const getScreenSize = useCallback(async () => {
        const status = await emulatorClient.getStatus({});
        const lcdHeight = status.hardwareConfig?.entry[34];
        const lcdWidth = status.hardwareConfig?.entry[95];
        setDeviceWidth(Number.parseInt(lcdWidth?.value || "1080"));
        setDeviceHeight(Number.parseInt(lcdHeight?.value || "1920"));
    }, [emulatorClient]);

    useEffect(() => {
        getScreenSize().catch((error) => console.error(error));
    }, [getScreenSize]);

    const scaleCoordinates = (xp: number, yp: number): { x: number; y: number; scaleX: number; scaleY: number } => {
        const { clientHeight, clientWidth } = handle.current;
        const scaleX = deviceWidth / clientWidth;
        const scaleY = deviceHeight / clientHeight;
        const x = Math.round(xp * scaleX);
        const y = Math.round(yp * scaleY);
        if (Number.isNaN(x) || Number.isNaN(y)) return { x: -1, y: -1, scaleX: -1, scaleY: -1 };
        return { x: x, y: y, scaleX: scaleX, scaleY: scaleY };
    };

    const sendMouseCoordinates = ({
        x,
        y,
        mouseButton,
        mouseDown,
    }: {
        x: number;
        y: number;
        mouseButton: number;
        mouseDown: boolean;
    }): void => {
        const request = new MouseEvent();
        const scaledCoordinates = scaleCoordinates(x, y);
        request.x = scaledCoordinates.x;
        request.y = scaledCoordinates.y;
        request.buttons = mouseDown ? mouseButton : 0;
        jsep.sendMouse(request);
    };

    const handleMouseDown = (event: React.MouseEvent): void => {
        const { offsetX, offsetY } = event.nativeEvent;
        const mouse = {
            x: offsetX,
            y: offsetY,
            mouseDown: true,
            mouseButton: (1 / 2) * event.button + 1,
        };
        setMouseDown(true);
        sendMouseCoordinates(mouse);
    };

    const handleMouseUp = (event: React.MouseEvent): void => {
        const { offsetX, offsetY } = event.nativeEvent;
        const mouse = {
            x: offsetX,
            y: offsetY,
            mouseDown: false,
            mouseButton: (1 / 2) * event.button + 1,
        };
        setMouseDown(false);
        sendMouseCoordinates(mouse);
    };

    const handleMouseMove = (event: React.MouseEvent): void => {
        if (!mouseDown) return;
        const { offsetX, offsetY } = event.nativeEvent;
        const mouse = {
            x: offsetX,
            y: offsetY,
            mouseDown: true,
            mouseButton: (1 / 2) * event.button + 1,
        };
        sendMouseCoordinates(mouse);
    };

    const scaleAxis = (value: number, minIn: number, maxIn: number): number => {
        const minOut = 0; // EV_ABS_MIN
        const maxOut = 2 ** 15 - 1; // EV_ABS_MAX
        const rangeOut = maxOut - minOut;
        const rangeIn = maxIn - minIn;
        if (rangeIn < 1) {
            return minOut + rangeOut / 2;
        }
        return Math.trunc(((value - minIn) * rangeOut) / rangeIn + minOut);
    };

    const sendTouchCoordinates = (touches: TouchList, minForce: number, maxForce: number): void => {
        const rect = handle.current.getBoundingClientRect();
        const touchesToSend = Object.values(touches).map((touch) => {
            const { clientX, clientY, identifier, force, radiusX, radiusY } = touch;
            const offsetX = clientX - rect.left;
            const offsetY = clientY - rect.top;
            const { x, y, scaleX, scaleY } = scaleCoordinates(offsetX, offsetY);
            const scaledRadiusX = 2 * radiusX * scaleX;
            const scaledRadiusY = 2 * radiusY * scaleY;
            const request = new Touch({ x, y, identifier });

            // Normalize the force
            const MT_PRESSURE = scaleAxis(Math.max(minForce, Math.min(maxForce, force)), 0, 1);
            request.pressure = MT_PRESSURE;
            request.touchMajor = Math.trunc(Math.max(scaledRadiusX, scaledRadiusY));
            request.touchMinor = Math.trunc(Math.min(scaledRadiusX, scaledRadiusY));

            return request;
        });

        const requestTouchEvent = new TouchEvent();
        requestTouchEvent.touches = touchesToSend;
        jsep.sendTouch(requestTouchEvent);
    };

    const handleTouch = (minForce: number, maxForce: number): ((event: React.TouchEvent) => void) => {
        return (event: React.TouchEvent) => {
            if (event.cancelable) event.preventDefault();
            sendTouchCoordinates(event.nativeEvent.changedTouches, minForce, maxForce);
        };
    };

    const handleKey = (eventType: "KEYDOWN" | "KEYUP"): ((event: React.KeyboardEvent) => void) => {
        return (event: React.KeyboardEvent) => {
            if (event.key === "space") event.preventDefault();

            const request = new KeyboardEvent();
            if (eventType === "KEYUP") request.eventType = KeyboardEvent_KeyEventType.keyup;
            if (eventType === "KEYDOWN") request.eventType = KeyboardEvent_KeyEventType.keydown;
            request.key = event.key;
            jsep.sendKeyboard(request);
        };
    };

    return (
        <div
            ref={handle}
            onTouchStart={handleTouch(0.01, 1)}
            onTouchMove={handleTouch(0.01, 1)}
            onTouchEnd={handleTouch(0, 0)}
            onTouchCancel={handleTouch(0, 0)}
            onMouseUp={handleMouseUp}
            onMouseOut={handleMouseUp}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onKeyUp={handleKey("KEYUP")}
            onKeyDown={handleKey("KEYDOWN")}
            onDragStart={(event) => event.preventDefault()}
            tabIndex={0}
            style={{
                pointerEvents: "all",
                outline: "none",
                margin: "0",
                padding: "0",
                border: "0",
                display: "inline-block",
                width: "100%",
            }}
        >
            {children}
        </div>
    );
};

export default WithMouseKeyHandler;

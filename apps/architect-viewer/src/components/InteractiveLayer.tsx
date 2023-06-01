import type JsepProtocol from "../services/Jsep.js";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client.js";

import {
    Touch,
    MouseEvent,
    TouchEvent,
    KeyboardEvent,
    KeyboardEvent_KeyEventType,
} from "../generated/emulator_controller.js";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface IWithMouseKeyHandlerProps extends React.PropsWithChildren {
    jsep: JsepProtocol;
    emulatorClient: IEmulatorControllerClient;
}

export const WithMouseKeyHandler: React.FunctionComponent<IWithMouseKeyHandlerProps> = ({
    jsep,
    emulatorClient,
    children,
}) => {
    const handle = useRef<HTMLDivElement>(undefined!);

    const [deviceWidth, setDeviceWidth] = useState(0);
    const [deviceHeight, setDeviceHeight] = useState(0);

    const [mouse, setMouse] = useState<{
        x: number;
        y: number;
        mouseButton: number;
        mouseDown: boolean;
    }>({
        x: -1,
        y: -1,
        mouseButton: 0,
        mouseDown: false,
    });

    const getScreenSize = useCallback(async (): Promise<void> => {
        const status = await emulatorClient.getStatus({}).response;
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

    const sendMouseCoordinates = (): void => {
        const { mouseDown, mouseButton, x, y } = mouse;
        const request = MouseEvent.create();
        const scaledCoordinates = scaleCoordinates(x, y);
        request.x = scaledCoordinates.x;
        request.y = scaledCoordinates.y;
        request.buttons = mouseDown ? mouseButton : 0;
        jsep.sendMouse(request);
    };

    const handleMouseDown = (event: React.MouseEvent): void => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({
            x: offsetX,
            y: offsetY,
            mouseDown: true,
            mouseButton: event.button === 0 ? 1 : event.button === 2 ? 2 : 0,
        });
        sendMouseCoordinates();
    };

    const handleMouseUp = (event: React.MouseEvent): void => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({ x: offsetX, y: offsetY, mouseDown: false, mouseButton: 0 });
        sendMouseCoordinates();
    };

    const handleMouseMove = (event: React.MouseEvent): void => {
        if (!mouse.mouseDown) return;
        const { offsetX, offsetY } = event.nativeEvent;
        mouse.x = offsetX;
        mouse.y = offsetY;
        setMouse(mouse);
        sendMouseCoordinates();
    };

    // eslint-disable-next-line unicorn/consistent-function-scoping
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

            const request = Touch.create();
            request.x = x;
            request.y = y;
            request.identifier = identifier;

            // Normalize the force
            const MT_PRESSURE = scaleAxis(Math.max(minForce, Math.min(maxForce, force)), 0, 1);
            request.pressure = MT_PRESSURE;
            request.touchMajor = Math.trunc(Math.max(scaledRadiusX, scaledRadiusY));
            request.touchMinor = Math.trunc(Math.min(scaledRadiusX, scaledRadiusY));

            return request;
        });

        const requestTouchEvent = TouchEvent.create();
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

            const request = KeyboardEvent.create();
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

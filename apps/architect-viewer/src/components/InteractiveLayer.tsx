import React, { useState, useRef, useEffect, PropsWithChildren } from "react";

import {
    MouseEvent,
    Touch,
    TouchEvent,
    KeyboardEvent,
    KeyboardEvent_KeyEventType,
} from "../generated/emulator_controller";
import type JsepProtocol from "../service/Jsep";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

interface withMouseKeyHandlerProps extends PropsWithChildren {
    jsep: JsepProtocol;
    emulatorClient: IEmulatorControllerClient;
}

export const WithMouseKeyHandler: React.FunctionComponent<withMouseKeyHandlerProps> = ({
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

    useEffect(() => {
        getScreenSize();
    }, [emulatorClient]);

    const getScreenSize = async () => {
        const status = await emulatorClient.getStatus({}).response;
        const lcdHeight = status.hardwareConfig?.entry[34];
        const lcdWidth = status.hardwareConfig?.entry[95];
        setDeviceWidth(parseInt(lcdWidth?.value || "1080"));
        setDeviceHeight(parseInt(lcdHeight?.value || "1920"));
    };

    const scaleCoordinates = (xp: number, yp: number) => {
        const { clientHeight, clientWidth } = handle.current;
        const scaleX = deviceWidth / clientWidth;
        const scaleY = deviceHeight / clientHeight;
        const x = Math.round(xp * scaleX);
        const y = Math.round(yp * scaleY);
        if (isNaN(x) || isNaN(y)) return { x: -1, y: -1, scaleX: -1, scaleY: -1 };
        return { x: x, y: y, scaleX: scaleX, scaleY: scaleY };
    };

    const sendMouseCoordinates = () => {
        const { mouseDown, mouseButton, x, y } = mouse;
        const request = MouseEvent.create();
        const scaledCoordinates = scaleCoordinates(x, y);
        request.x = scaledCoordinates.x;
        request.y = scaledCoordinates.y;
        request.buttons = mouseDown ? mouseButton : 0;
        jsep.sendMouse(request);
    };

    const handleMouseDown = (event: React.MouseEvent) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({
            x: offsetX,
            y: offsetY,
            mouseDown: true,
            mouseButton: event.button === 0 ? 1 : event.button === 2 ? 2 : 0,
        });
        sendMouseCoordinates();
    };

    const handleMouseUp = (event: React.MouseEvent) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({ x: offsetX, y: offsetY, mouseDown: false, mouseButton: 0 });
        sendMouseCoordinates();
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (!mouse.mouseDown) return;
        const { offsetX, offsetY } = event.nativeEvent;
        mouse.x = offsetX;
        mouse.y = offsetY;
        setMouse(mouse);
        sendMouseCoordinates();
    };

    const scaleAxis = (value: number, minIn: number, maxIn: number) => {
        const minOut = 0x0; // EV_ABS_MIN
        const maxOut = 0x7fff; // EV_ABS_MAX
        const rangeOut = maxOut - minOut;
        const rangeIn = maxIn - minIn;
        if (rangeIn < 1) {
            return minOut + rangeOut / 2;
        }
        return (((value - minIn) * rangeOut) / rangeIn + minOut) | 0;
    };

    const sendTouchCoordinates = (touches: TouchList, minForce: number, maxForce: number) => {
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
            request.touchMajor = Math.max(scaledRadiusX, scaledRadiusY) | 0;
            request.touchMinor = Math.min(scaledRadiusX, scaledRadiusY) | 0;

            return request;
        });

        const requestTouchEvent = TouchEvent.create();
        requestTouchEvent.touches = touchesToSend;
        jsep.sendTouch(requestTouchEvent);
    };

    const handleTouch = (minForce: number, maxForce: number) => {
        return (event: React.TouchEvent) => {
            if (event.cancelable) event.preventDefault();
            sendTouchCoordinates(event.nativeEvent.changedTouches, minForce, maxForce);
        };
    };

    const handleKey = (eventType: "KEYDOWN" | "KEYUP") => {
        return (event: React.KeyboardEvent) => {
            if (event.key === "space") event.preventDefault();

            const request = KeyboardEvent.create();
            request.eventType =
                eventType === "KEYDOWN"
                    ? KeyboardEvent_KeyEventType.keydown
                    : eventType === "KEYUP"
                    ? KeyboardEvent_KeyEventType.keyup
                    : KeyboardEvent_KeyEventType.keypress;

            request.key = event.key;
            jsep.sendKeyboard(request);
        };
    };

    return (
        <div
            ref={handle}
            onTouchStart={handleTouch(0.01, 1.0)}
            onTouchMove={handleTouch(0.01, 1.0)}
            onTouchEnd={handleTouch(0.0, 0.0)}
            onTouchCancel={handleTouch(0.0, 0.0)}
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

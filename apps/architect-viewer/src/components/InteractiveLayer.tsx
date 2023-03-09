import React, { useState } from "react";

import type JsepProtocol from "../service/Jsep2";

interface withMouseKeyHandlerProps {
    jsep: JsepProtocol;
    WrappedComponent: React.FunctionComponent;
}

export const withMouseKeyHandler: React.FunctionComponent<withMouseKeyHandlerProps> = ({ WrappedComponent }) => {
    // const [deviceWidth, setDeviceWidth] = useState(0);
    // const [deviceHeight, setDeviceHeight] = useState(0);

    // const [clientWidth, setClientWidth] = useState(0);
    // const [clientHeight, setClientHeight] = useState(0);

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

    // const sendMouseCoordinates = () => {
    //     const { mouseDown, mouseButton, x, y } = mouse;
    //     const request = MouseEvent.create();
    //     request.x = Math.round((x * deviceWidth) / clientWidth);
    //     request.y = Math.round((y * deviceHeight) / clientHeight);
    //     request.buttons = mouseDown ? mouseButton : 0;
    //     jsep.send("mouse", request);
    // };

    const handleMouseDown = (event: React.MouseEvent) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({
            x: offsetX,
            y: offsetY,
            mouseDown: true,
            mouseButton: event.button === 0 ? 1 : event.button === 2 ? 2 : 0,
        });
    };

    const handleMouseUp = (event: React.MouseEvent) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setMouse({ x: offsetX, y: offsetY, mouseDown: false, mouseButton: 0 });
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (!mouse.mouseDown) return;
        const { offsetX, offsetY } = event.nativeEvent;
        mouse.x = offsetX;
        mouse.y = offsetY;
        setMouse(mouse);
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseOut={handleMouseUp}
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
            <WrappedComponent />
        </div>
    );
};

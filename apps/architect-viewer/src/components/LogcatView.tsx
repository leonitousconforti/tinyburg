import type { IEmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { List } from "@mui/material";
import { ListItem } from "@mui/material";
import { ListItemText } from "@mui/material";

import Logcat from "../services/Logcat.js";
import React, { useEffect, useState } from "react";

export interface ILogcatViewProps {
    maxHistory?: number;
    emulatorClient: IEmulatorControllerClient;
}

export const LogcatView: React.FunctionComponent<ILogcatViewProps> = ({ emulatorClient, maxHistory = 100 }) => {
    const [lines, setLines] = useState<string[]>([]);

    const onMessages = (logLines: string[]): void => {
        let buffer = [...logLines, ...lines];
        const sliceAt = buffer.length - maxHistory;
        if (sliceAt > 0) buffer = buffer.slice(0, sliceAt);
        setLines(buffer);
    };

    useEffect(() => {
        new Logcat(emulatorClient, onMessages).startStream().catch((error) => console.error(error));
    }, [emulatorClient]);

    const asItems = (logLines: string[]): JSX.Element[] => {
        let i = 0;
        return logLines.map((line) => (
            <ListItem key={i++}>
                <ListItemText primary={line} />
            </ListItem>
        ));
    };

    return <List dense={true}>{asItems(lines)}</List>;
};

export default LogcatView;

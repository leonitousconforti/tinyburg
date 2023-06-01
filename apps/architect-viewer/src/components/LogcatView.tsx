import type React from "react";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client.js";

import { List } from "@mui/material";
import { ListItem } from "@mui/material";
import { ListItemText } from "@mui/material";

import Logcat from "../services/Logcat.js";
import { useEffect, useState } from "react";

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
        new Logcat(emulatorClient, onMessages);
    }, [emulatorClient]);

    // eslint-disable-next-line unicorn/consistent-function-scoping
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

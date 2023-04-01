import React, { useEffect, useState } from "react";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

import Logcat from "../service/Logcat";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

export interface LogcatViewProps {
    maxHistory?: number;
    emulatorClient: IEmulatorControllerClient;
}

export const LogcatView: React.FunctionComponent<LogcatViewProps> = ({ emulatorClient, maxHistory = 100 }) => {
    const [lines, setLines] = useState<string[]>([]);

    const onMessages = (logLines: string[]) => {
        let buffer = logLines.concat(lines);
        const sliceAt = buffer.length - maxHistory;
        if (sliceAt > 0) buffer = buffer.slice(0, sliceAt);
        setLines(buffer);
    };

    useEffect(() => {
        new Logcat(emulatorClient, onMessages);
    }, [emulatorClient]);

    const asItems = (logLines: string[]) => {
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

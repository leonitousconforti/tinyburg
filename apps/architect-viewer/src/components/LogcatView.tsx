import React, { useEffect, useState } from "react";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

import Logcat from "../service/Logcat";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

export interface LogcatViewProps {
    maxHistory?: number;
    emulator: IEmulatorControllerClient;
}

export const LogcatView: React.FunctionComponent<LogcatViewProps> = ({ emulator, maxHistory = 100 }) => {
    useEffect(() => {
        const logcat = new Logcat(emulator);
        logcat.on("data", onLogcat);
        logcat.on("end", (error) => console.log(error));
    }, []);

    const [lines, setLines] = useState<string[]>([]);

    const onLogcat = (logline: string) => {
        let buffer = logline.split("\n").concat(lines);
        const sliceAt = buffer.length - maxHistory;
        if (sliceAt > 0) {
            buffer = buffer.slice(0, sliceAt);
        }
        setLines(buffer);
    };

    const asItems = (loglines: string[]) => {
        let i = 0;
        return loglines.map((line) => (
            <ListItem key={i++}>
                <ListItemText primary={line} />
            </ListItem>
        ));
    };

    return <List dense={true}>{asItems(lines)}</List>;
};

export default LogcatView;

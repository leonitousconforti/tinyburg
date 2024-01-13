import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import { List } from "@mui/material";
import { ListItem } from "@mui/material";
import { ListItemText } from "@mui/material";

import Logcat from "../services/Logcat.js";
import React, { useEffect, useState } from "react";

export interface ILogcatViewProps {
    emulatorClient: PromiseClient<typeof EmulatorController>;
}

export const LogcatView: React.FunctionComponent<ILogcatViewProps> = ({ emulatorClient }) => {
    const [lines, setLines] = useState<string[]>([]);

    useEffect(() => {
        new Logcat(emulatorClient, setLines).startStream().catch((error) => console.error(error));
    }, [emulatorClient]);

    const asItems = (logLines: string[]): JSX.Element[] => {
        let i = 0;
        return logLines.reverse().map((line) => (
            <ListItem key={i++}>
                <ListItemText primary={line} />
            </ListItem>
        ));
    };

    return <List dense={true}>{asItems(lines)}</List>;
};

export default LogcatView;

import type { Transport } from "@connectrpc/connect";

import React from "react";
import { Box, Grid, Container } from "@mui/material";
import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import { Rtc } from "@tinyburg/architect/protobuf/rtc_service_connect";
import { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import JsepProtocol from "../services/Jsep.js";
import Copyright from "../components/Copyright.js";
import WebRtcView from "../components/WebRtcView.js";
import LogcatView from "../components/LogcatView.js";
import WithMouseKeyHandler from "../components/InteractiveLayer.js";

interface IEmulatorProps {
    address: string;
}

export const Emulator: React.FunctionComponent<IEmulatorProps> = ({ address }) => {
    const useTransport = (): Transport => React.useMemo(() => createGrpcWebTransport({ baseUrl: address }), [address]);

    const [rtcClient] = React.useState(createPromiseClient(Rtc, useTransport()));
    const [jsepService] = React.useState(new JsepProtocol(rtcClient));
    const [emulatorClient] = React.useState(createPromiseClient(EmulatorController, useTransport()));

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <Container maxWidth="sm">
                        <WithMouseKeyHandler emulatorClient={emulatorClient} jsep={jsepService}>
                            <WebRtcView jsep={jsepService} muted={true} volume={1} />
                        </WithMouseKeyHandler>
                    </Container>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <LogcatView emulatorClient={emulatorClient} />
                </Grid>
            </Grid>
            <Box mt={8}>
                <Copyright />
            </Box>
        </>
    );
};

export default Emulator;

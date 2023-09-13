import React from "react";
import { Box, Grid, Container } from "@mui/material";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

import { RtcClient } from "@tinyburg/architect/protobuf/rtc_service.client.js";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import JsepProtocol from "../services/Jsep.js";
import Copyright from "../components/Copyright.js";
import WebRtcView from "../components/WebRtcView.js";
import LogcatView from "../components/LogcatView.js";
import WithMouseKeyHandler from "../components/InteractiveLayer.js";

interface IEmulatorProps {
    address: string;
}

export const Emulator: React.FunctionComponent<IEmulatorProps> = ({ address }) => {
    const useTransport = (): GrpcWebFetchTransport =>
        React.useMemo(() => new GrpcWebFetchTransport({ baseUrl: address }), [address]);

    const [rtcClient] = React.useState(new RtcClient(useTransport()));
    const [jsepService] = React.useState(new JsepProtocol(rtcClient));
    const [emulatorClient] = React.useState(new EmulatorControllerClient(useTransport()));

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

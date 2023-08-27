import type { IEmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import React from "react";
import { Box, Grid, Container } from "@mui/material";

// import JsepProtocol from "../services/Jsep.js";
import Copyright from "../components/Copyright.js";
// import WebRtcView from "../components/WebRtcView.js";
import LogcatView from "../components/LogcatView.js";
// import WithMouseKeyHandler from "../components/InteractiveLayer.js";

interface IEmulatorProps {
    emulatorClient: IEmulatorControllerClient;
}

export const Emulator: React.FunctionComponent<IEmulatorProps> = ({ emulatorClient }) => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    // const useJsep = () => useMemo(() => new JsepProtocol(rtcClient), [rtcClient]);

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <Container maxWidth="sm">
                        {/* <WithMouseKeyHandler jsep={useJsep()} emulatorClient={emulatorClient}>
                            <WebRtcView jsep={useJsep()} muted={true} volume={1} />
                        </WithMouseKeyHandler> */}
                        <p>State: testing </p>
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

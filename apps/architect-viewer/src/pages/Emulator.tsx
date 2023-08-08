import type { IRtcClient } from "@tinyburg/architect/protobuf/rtc_service.client.js";
import type { IEmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import React from "react";
// import { Alert, Box, Grid, Snackbar, Container } from "@mui/material";

// import JsepProtocol from "../services/Jsep.js";
// import Copyright from "../components/Copyright.js";
// import WebRtcView from "../components/WebRtcView.js";
// import LogcatView from "../components/LogcatView.js";
// import WithMouseKeyHandler from "../components/InteractiveLayer.js";

interface IEmulatorProps {
    rtcClient: IRtcClient;
    emulatorClient: IEmulatorControllerClient;
}

export const Emulator: React.FunctionComponent<IEmulatorProps> = () => {
    // const [errorMessage, setErrorMessage] = useState("");
    // const [displayErrorSnack, setDisplayErrorSnack] = useState(false);

    // const useJsep = () => useMemo(() => new JsepProtocol(rtcClient), [rtcClient]);

    // emulatorClient;

    return (
        <>
            {/* <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <Container maxWidth="sm">
                        <WithMouseKeyHandler jsep={useJsep()} emulatorClient={emulatorClient}>
                            <WebRtcView jsep={useJsep()} muted={true} volume={1} />
                        </WithMouseKeyHandler>
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
            <Snackbar open={displayErrorSnack} autoHideDuration={6000}>
                <Alert onClose={() => setDisplayErrorSnack(false)} severity="error">
                    {errorMessage}
                </Alert>
            </Snackbar> */}
        </>
    );
};

export default Emulator;

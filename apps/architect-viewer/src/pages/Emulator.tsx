import type { TokenAuthService } from "../services/Auth.js";
import type { IRtcClient } from "@tinyburg/architect/protobuf/rtc_service.client.js";
import type { IEmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import {
    Image as ImageIcon,
    VolumeUp,
    ExitToApp,
    VolumeDown,
    LocationOn as LocationOnIcon,
    OndemandVideo as OndemandVideoIcon,
} from "@mui/icons-material";
import { Alert, Box, Grid, Slider, AppBar, Toolbar, Snackbar, Container, IconButton, Typography } from "@mui/material";

import React, { useState } from "react";
import JsepProtocol from "../services/Jsep.js";
import Copyright from "../components/Copyright.js";
import WebRtcView from "../components/WebRtcView.js";
import LogcatView from "../components/LogcatView.js";
import WithMouseKeyHandler from "../components/InteractiveLayer.js";

interface IEmulatorProps {
    rtcClient: IRtcClient;
    auth: TokenAuthService;
    emulatorClient: IEmulatorControllerClient;
}

export const Emulator: React.FunctionComponent<IEmulatorProps> = ({ auth, emulatorClient, rtcClient }) => {
    const [volume, setVolume] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [displayErrorSnack, setDisplayErrorSnack] = useState(false);
    const [gps, setGps] = useState<{ latitude: number; longitude: number }>({ latitude: 0, longitude: 0 });

    const updateLocation = (): void => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((location) => {
                setGps({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            });
        }
    };

    const jsep = new JsepProtocol(rtcClient);

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Using emulator view: webrtc
                    </Typography>

                    <Box width={200} paddingTop={1}>
                        <Grid container spacing={2}>
                            <Grid item>
                                <VolumeDown />
                            </Grid>
                            <Grid item xs>
                                <Slider
                                    value={volume}
                                    onChange={(_event, newVolume) => setVolume(newVolume as number)}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    aria-labelledby="continuous-slider"
                                />
                            </Grid>
                            <Grid item>
                                <VolumeUp />
                            </Grid>
                        </Grid>
                    </Box>

                    <div>
                        <IconButton aria-label="Get current location" color="inherit" onClick={() => updateLocation}>
                            <LocationOnIcon />
                        </IconButton>
                        <IconButton aria-label="Switch to webrtc" color="inherit" onClick={() => {}}>
                            <OndemandVideoIcon />
                        </IconButton>
                        <IconButton aria-label="Switch to screenshots" color="inherit" onClick={() => {}}>
                            <ImageIcon />
                        </IconButton>
                        <IconButton edge="end" aria-label="logout" color="inherit" onClick={() => auth.logout()}>
                            <ExitToApp />
                        </IconButton>
                    </div>
                </Toolbar>
            </AppBar>

            <div>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Container maxWidth="sm">
                            <WithMouseKeyHandler jsep={jsep} emulatorClient={emulatorClient}>
                                <WebRtcView jsep={jsep} muted={true} volume={1} />
                            </WithMouseKeyHandler>
                            <p>State: testing </p>
                        </Container>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <LogcatView emulatorClient={emulatorClient} />
                    </Grid>
                </Grid>
            </div>
            <Box mt={8}>
                <Copyright />
            </Box>
            <Snackbar open={displayErrorSnack} autoHideDuration={6000}>
                <Alert onClose={() => setDisplayErrorSnack(false)} severity="error">
                    {errorMessage}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default Emulator;

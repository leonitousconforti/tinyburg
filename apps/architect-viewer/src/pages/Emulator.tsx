import React, { useState } from "react";

import Alert from "@material-ui/lab/Alert";
import ImageIcon from "@material-ui/icons/Image";
import VolumeUp from "@material-ui/icons/VolumeUp";
import ExitToApp from "@material-ui/icons/ExitToApp";
import VolumeDown from "@material-ui/icons/VolumeDown";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import OndemandVideoIcon from "@material-ui/icons/OndemandVideo";

import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Snackbar from "@material-ui/core/Snackbar";
import Container from "@material-ui/core/Container";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import { Theme, WithStyles, withStyles, createStyles } from "@material-ui/core/styles";

import JsepProtocol from "../service/Jsep";
import Copyright from "../components/Copyright";
import WebRtcView from "../components/WebRtcView";
import LogcatView from "../components/LogcatView";
import WithMouseKeyHandler from "../components/InteractiveLayer";
import type { TokenAuthService } from "../service/Auth";
import type { IRtcClient } from "../generated/rtc_service.client";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

const styles = (theme: Theme) =>
    createStyles({
        root: {
            flexGrow: 1,
        },
        menuButton: {
            marginRight: theme.spacing(2),
        },
        title: {
            flexGrow: 1,
        },
        nofocusborder: {
            outline: "none !important;",
        },
        paper: {
            marginTop: theme.spacing(4),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        },
    });

const WhiteSlider = withStyles({
    thumb: {
        color: "white",
    },
    track: {
        color: "white",
    },
    rail: {
        color: "white",
    },
})(Slider);

interface EmulatorProps extends WithStyles<typeof styles> {
    rtcClient: IRtcClient;
    auth: TokenAuthService;
    emulatorClient: IEmulatorControllerClient;
}

export const Emulator: React.FunctionComponent<EmulatorProps> = ({ classes, auth, emulatorClient, rtcClient }) => {
    const [volume, setVolume] = useState(0);
    const [errorMessage, _setErrorMessage] = useState("");
    const [displayErrorSnack, setDisplayErrorSnack] = useState(false);
    const [_gps, setGps] = useState<{ latitude: number; longitude: number }>({ latitude: 0, longitude: 0 });

    const updateLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((location) => {
                setGps({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            });
        }
    };

    const jsep = new JsepProtocol(rtcClient);
    console.log("here2");

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" className={classes.title}>
                        Using emulator view: webrtc
                    </Typography>

                    <Box width={200} paddingTop={1}>
                        <Grid container spacing={2}>
                            <Grid item>
                                <VolumeDown />
                            </Grid>
                            <Grid item xs>
                                <WhiteSlider
                                    value={volume}
                                    onChange={(_, newVolume) => setVolume(newVolume as number)}
                                    min={0.0}
                                    max={1.0}
                                    step={0.01}
                                    aria-labelledby="continuous-slider"
                                />
                            </Grid>
                            <Grid item>
                                <VolumeUp />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* <div className={classes.grow} /> */}
                    {/* <div className={classes.sectionDesktop}> */}
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

            <div className={classes.paper}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Container maxWidth="sm">
                            <WithMouseKeyHandler jsep={jsep} emulatorClient={emulatorClient}>
                                <WebRtcView jsep={jsep} muted={true} volume={1.0} />
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

export default withStyles(styles)(Emulator);

import { Buffer } from "buffer";
import React, { useState } from "react";
import Copyright from "../components/Copyright.js";

import {
    Box,
    Avatar,
    Button,
    Snackbar,
    Container,
    TextField,
    Typography,
    IconButton,
    CssBaseline,
} from "@mui/material";
import { Close as CloseIcon, LockOutlined as LockOutlinedIcon } from "@mui/icons-material";

interface ILoginProps {
    onAuthorized: (
        emulatorEndpoint: string,
        authorizationHeader: { readonly Authorization: `Bearer ${string}` }
    ) => void;
}

const Login: React.FunctionComponent<ILoginProps> = ({ onAuthorized }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [displayErrorSnack, setDisplayErrorSnack] = useState(false);
    const [emulatorEndpoint, setEmulatorEndpoint] = useState(
        `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
    );

    const tryLogin = async (): Promise<{ readonly Authorization: `Bearer ${string}` }> => {
        const response = await fetch(`${emulatorEndpoint}/token`, {
            headers: {
                Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
            },
        });
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const token = await response.text();
        const authorizationHeader = { Authorization: `Bearer ${token}` } as const;
        onAuthorized(emulatorEndpoint, authorizationHeader);
        return authorizationHeader;
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
                sx={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: "primary" }}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>

                <Snackbar
                    open={displayErrorSnack}
                    autoHideDuration={4000}
                    ContentProps={{
                        "aria-describedby": "snackbar-fab-message-id",
                    }}
                    message={<span id="snackbar-fab-message-id">Failed to login..</span>}
                    onClose={() => setDisplayErrorSnack(false)}
                    action={[
                        <IconButton
                            key="close"
                            aria-label="close"
                            color="inherit"
                            onClick={() => setDisplayErrorSnack(false)}
                        >
                            <CloseIcon />
                        </IconButton>,
                    ]}
                />
                <Box component="form" noValidate sx={{ width: "100%", mt: 1 }}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Username"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        id="password"
                        label="Password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") tryLogin().catch(() => setDisplayErrorSnack(true));
                        }}
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        id="Emulator-endpoint"
                        label="Emulator endpoint"
                        name="Emulator endpoint"
                        value={emulatorEndpoint}
                        onChange={(event) => setEmulatorEndpoint(event.target.value)}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={() => tryLogin().catch(() => setDisplayErrorSnack(true))}
                    >
                        Sign In
                    </Button>
                </Box>
            </Box>
            <Box mt={8}>
                <Copyright />
            </Box>
        </Container>
    );
};

export default Login;

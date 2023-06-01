import type { TokenAuthService } from "../services/Auth.js";

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
    auth: TokenAuthService;
}

const Login: React.FunctionComponent<ILoginProps> = ({ auth }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayErrorSnack, setDisplayErrorSnack] = useState(false);

    const login = (): Promise<void> => auth.login(email, password);

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
                <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
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
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") login().catch(() => setDisplayErrorSnack(true));
                        }}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={() => login().catch(() => setDisplayErrorSnack(true))}
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

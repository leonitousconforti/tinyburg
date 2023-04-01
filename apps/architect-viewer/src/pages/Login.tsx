import React, { useState } from "react";

import CloseIcon from "@material-ui/icons/Close";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";

import Box from "@material-ui/core/Box/Box";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Snackbar from "@material-ui/core/Snackbar";
import Container from "@material-ui/core/Container";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CssBaseline from "@material-ui/core/CssBaseline";
import { Theme, WithStyles, withStyles, createStyles } from "@material-ui/core/styles";

import Copyright from "../components/Copyright";
import type { TokenAuthService } from "../service/Auth";

const styles = (theme: Theme) =>
    createStyles({
        "@global": {
            body: {
                backgroundColor: theme.palette.common.white,
            },
        },
        paper: {
            marginTop: theme.spacing(8),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        },
        avatar: {
            margin: theme.spacing(1),
            backgroundColor: theme.palette.secondary.main,
        },
        form: {
            width: "100%",
            marginTop: theme.spacing(1),
        },
        submit: {
            margin: theme.spacing(3, 0, 2),
        },
    });

interface LoginProps extends WithStyles<typeof styles> {
    auth: TokenAuthService;
}

const Login: React.FunctionComponent<LoginProps> = ({ classes, auth }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayErrorSnack, setDisplayErrorSnack] = useState(false);

    const login = () => auth.login(email, password).catch(() => setDisplayErrorSnack(true));

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Avatar className={classes.avatar}>
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
                <form className={classes.form} noValidate>
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
                            if (event.key === "Enter") login();
                        }}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        className={classes.submit}
                        onClick={() => login()}
                    >
                        Sign In
                    </Button>
                </form>
            </div>
            <Box mt={8}>
                <Copyright />
            </Box>
        </Container>
    );
};

export default withStyles(styles)(Login);

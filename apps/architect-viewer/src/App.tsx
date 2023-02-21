import React, { useState, useRef } from "react";

import Login from "./components/Login";
import LogcatView from "./components/LogcatView";
import { TokenAuthService } from "./service/Auth";

const EMULATOR_GRPC = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
const AUTH_ENDPOINT = EMULATOR_GRPC + "/token";

function useAuth() {
    const authRef = useRef<TokenAuthService>();
    if (!authRef.current) {
        authRef.current = new TokenAuthService(AUTH_ENDPOINT);
    }
    return authRef.current;
}

const App: React.FunctionComponent<{}> = () => {
    const [authorized, setAuthorized] = useState(false);

    const auth = useAuth();
    auth.on("authorized", (authorized) => setAuthorized(authorized));

    return <div>{authorized ? <LogcatView uri={EMULATOR_GRPC} auth={auth} /> : <Login auth={auth} />}</div>;
};

export default App;

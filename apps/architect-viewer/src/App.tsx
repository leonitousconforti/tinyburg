import type React from "react";

import { useState, useMemo } from "react";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

import Login from "./pages/Login.js";
import Emulator from "./pages/Emulator.js";
import AuthService from "./services/Auth.js";
import { RtcClient } from "./generated/rtc_service.client.js";
import { EmulatorControllerClient } from "./generated/emulator_controller.client.js";

const EMULATOR_GRPC: string = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
const AUTH_ENDPOINT: string = EMULATOR_GRPC + "/token";

const useAuth = (authEndpoint: string, onAuthorized: (authorized: boolean) => void): AuthService =>
    useMemo(() => new AuthService(authEndpoint, onAuthorized), [authEndpoint, onAuthorized]);

const App: React.FunctionComponent<{}> = () => {
    const [authorized, setAuthorized] = useState(false);
    const auth = useAuth(AUTH_ENDPOINT, (authorized) => setAuthorized(authorized));

    const makeTransport = (): GrpcWebFetchTransport =>
        new GrpcWebFetchTransport({
            baseUrl: EMULATOR_GRPC,
            meta: auth.getAuthHeader(),
        });

    return (
        <div>
            {authorized ? (
                <Emulator
                    auth={auth}
                    rtcClient={new RtcClient(makeTransport())}
                    emulatorClient={new EmulatorControllerClient(makeTransport())}
                />
            ) : (
                <Login auth={auth} />
            )}
        </div>
    );
};

export default App;

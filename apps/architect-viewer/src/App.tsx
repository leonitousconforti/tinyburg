import React, { useState, useMemo } from "react";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

import Login from "./pages/Login";
import Emulator from "./pages/Emulator";
import AuthService from "./service/Auth";
import { RtcClient } from "./generated/rtc_service.client";
import { EmulatorControllerClient } from "./generated/emulator_controller.client";

const EMULATOR_GRPC = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
const AUTH_ENDPOINT = EMULATOR_GRPC + "/token";

const useAuth = (AUTH_ENDPOINT: string, onAuthorized: (authorized: boolean) => void) =>
    useMemo(() => new AuthService(AUTH_ENDPOINT, onAuthorized), []);

const App: React.FunctionComponent<{}> = () => {
    const [authorized, setAuthorized] = useState(false);
    const auth = useAuth(AUTH_ENDPOINT, (authorized) => setAuthorized(authorized));

    const makeTransport = () =>
        new GrpcWebFetchTransport({
            baseUrl: EMULATOR_GRPC,
            meta: auth.getAuthHeader() as Record<string, string>,
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

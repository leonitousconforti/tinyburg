import React, { useState, useMemo } from "react";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

import Login from "./components/Login";
import WebRtcView from "./components/WebRtcView";
import { TokenAuthService } from "./service/Auth";
import { RtcClient } from "./generated/rtc_service.client";
import { EmulatorControllerClient } from "./generated/emulator_controller.client";

const EMULATOR_GRPC = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
const AUTH_ENDPOINT = EMULATOR_GRPC + "/token";

const useAuth = () => useMemo(() => new TokenAuthService(AUTH_ENDPOINT), []);

// @ts-ignore
function useEmulatorClient(auth: TokenAuthService) {
    const transport = new GrpcWebFetchTransport({
        baseUrl: EMULATOR_GRPC,
        meta: auth.authHeader() as Record<string, string>,
    });
    return new EmulatorControllerClient(transport);
}

function useRtcClient(auth: TokenAuthService) {
    const transport = new GrpcWebFetchTransport({
        baseUrl: EMULATOR_GRPC,
        meta: auth.authHeader() as Record<string, string>,
    });
    return new RtcClient(transport);
}

const App: React.FunctionComponent<{}> = () => {
    const [authorized, setAuthorized] = useState(false);

    const auth = useAuth();
    auth.on("authorized", (authorized) => setAuthorized(authorized));

    return <div>{authorized ? <WebRtcView rtcClient={useRtcClient(auth)} /> : <Login auth={auth} />}</div>;
};

export default App;

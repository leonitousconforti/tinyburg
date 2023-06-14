import React, { useState, useMemo } from "react";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { RtcClient } from "@tinyburg/architect/protobuf/rtc_service.client.js";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import Login from "./pages/Login.js";
import Emulator from "./pages/Emulator.js";

const App: React.FunctionComponent<{}> = () => {
    const [authState, setAuthState] = useState<{
        authorized: boolean;
        emulatorEndpoint: string;
        authorizationHeader: { readonly Authorization: `Bearer ${string}` };
    }>({
        authorized: false,
        emulatorEndpoint: "",
        authorizationHeader: { Authorization: "Bearer " },
    });

    const useTransport = (): GrpcWebFetchTransport =>
        useMemo(
            () =>
                new GrpcWebFetchTransport({
                    baseUrl: authState.emulatorEndpoint,
                    meta: authState.authorizationHeader,
                }),
            [authState.emulatorEndpoint, authState.authorizationHeader]
        );

    return (
        <>
            {authState.authorized ? (
                <Emulator
                    rtcClient={new RtcClient(useTransport())}
                    emulatorClient={new EmulatorControllerClient(useTransport())}
                />
            ) : (
                <Login
                    onAuthorized={(emulatorEndpoint, authorizationHeader) =>
                        setAuthState({ authorized: true, emulatorEndpoint, authorizationHeader })
                    }
                />
            )}
        </>
    );
};

export default App;

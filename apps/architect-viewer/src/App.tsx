import React from "react";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
// import { RtcClient } from "@tinyburg/architect/protobuf/rtc_service.client.js";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import Emulator from "./components/Emulator.js";

const App: React.FunctionComponent<{}> = () => {
    // const useTransport = (): GrpcWebFetchTransport =>
    //     useMemo(() => new GrpcWebFetchTransport({ baseUrl: "http://skynet.internal.leoconforti.us:32841" }), []);

    return (
        <Emulator
            emulatorClient={
                new EmulatorControllerClient(
                    new GrpcWebFetchTransport({ baseUrl: "http://skynet.internal.leoconforti.us:32853" })
                )
            }
        />
    );
};

export default App;

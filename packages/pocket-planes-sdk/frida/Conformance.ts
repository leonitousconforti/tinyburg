import { Effect } from "effect";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Conformance from "@tinyburg/insight/node/Conformance";
import { Endpoints } from "@tinyburg/pocket-planes-sdk";

// Runs Pocket Planes on insight's emulator, records what it says to Nimblebit and
// checks this SDK's endpoints against it. See packages/insight/README.md.
Conformance.main(Endpoints.Api, "com.nimblebit.pocketplanes", "AUTHPROXY_POCKETPLANES_NIMBLEBIT_AUTH_KEY").pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
);

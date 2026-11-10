import { Effect } from "effect";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Endpoints } from "@tinyburg/bitcity-sdk";
import * as Conformance from "@tinyburg/insight/node/Conformance";

// Runs Bit City on insight's emulator, records what it says to Nimblebit and
// checks this SDK's endpoints against it. See packages/insight/README.md.
Conformance.main(Endpoints.Api, "com.nimblebit.bitcity", "AUTHPROXY_BITCITY_NIMBLEBIT_AUTH_KEY").pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
);

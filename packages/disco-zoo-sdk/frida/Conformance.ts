import { Effect } from "effect";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Endpoints } from "@tinyburg/disco-zoo-sdk";
import * as Conformance from "@tinyburg/insight/node/Conformance";

// Runs Disco Zoo on insight's emulator, records what it says to Nimblebit and
// checks this SDK's endpoints against it. See packages/insight/README.md.
Conformance.main(Endpoints.Api, "com.nimblebit.discozoo", "AUTHPROXY_DISCOZOO_NIMBLEBIT_AUTH_KEY").pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
);

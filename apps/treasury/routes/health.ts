import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

/** Liveness only: the process is up and routing. */
export const HealthRoutesLive = HttpRouter.add(
    "GET",
    "/health",
    Effect.orDie(HttpServerResponse.json({ status: "ok" }))
);

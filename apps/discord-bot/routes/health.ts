import { Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

/**
 * Liveness only. The bot has no upstream it must be able to reach to be
 * healthy: it answers Discord's signed requests, and a provider that is down
 * makes links fail without making this process worth restarting.
 */
export const HealthCheckRoutesLive = HttpRouter.add(
    "GET",
    "/healthz",
    HttpServerResponse.text("OK", { status: 200 })
).pipe(Layer.provide(HttpRouter.disableLogger));

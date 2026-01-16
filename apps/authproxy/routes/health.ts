import { HttpLayerRouter, HttpServerResponse } from "@effect/platform";
import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";
import { Duration, Effect, Layer } from "effect";

export const HealthCheck = Effect.cachedWithTTL(
    NimblebitAuth.NimblebitAuth.pipe(
        Effect.flatMap((auth) => auth.burnbot),
        Effect.flatMap(TinyTower.raffle_checkEnteredCurrent),
        Effect.as(HttpServerResponse.text("OK", { status: 200 })),
        Effect.orDie
    ),
    Duration.hours(1)
);

export const HealthCheckRoute = HealthCheck.pipe(
    Effect.map((execute) => HttpLayerRouter.add("GET", "/healthz", execute)),
    Layer.unwrapEffect
);

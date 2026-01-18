import { HttpLayerRouter, HttpServerResponse } from "@effect/platform";
import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";
import { Duration, Effect, Layer } from "effect";

export const HealthCheckRoute = Layer.unwrapEffect(
    Effect.gen(function* () {
        const HealthCheck = yield* NimblebitAuth.NimblebitAuth.pipe(
            Effect.flatMap((auth) => auth.burnbot),
            Effect.flatMap(TinyTower.raffle_checkEnteredCurrent),
            Effect.as(HttpServerResponse.text("OK", { status: 200 })),
            Effect.tapError(Effect.logError),
            Effect.tapDefect(Effect.logError),
            Effect.orDie,
            Effect.cachedWithTTL(Duration.hours(1))
        );

        return HttpLayerRouter.add("GET", "/healthz", HealthCheck);
    })
).pipe(Layer.provide(HttpLayerRouter.disableLogger));

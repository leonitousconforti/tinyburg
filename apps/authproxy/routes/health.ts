import { Duration, Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse, HttpClient } from "effect/unstable/http";

import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

export const HealthCheckRoutesLive = Layer.unwrap(
    Effect.gen(function* () {
        const auth = yield* NimblebitAuth.NimblebitAuth;
        const httpClient = yield* HttpClient.HttpClient;

        const HealthCheck = yield* NimblebitAuth.NimblebitAuth.pipe(
            Effect.flatMap((auth) => auth.burnbot),
            Effect.flatMap(TinyTower.raffle_checkEnteredCurrent),
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.provideService(NimblebitAuth.NimblebitAuth, auth),
            Effect.as(HttpServerResponse.text("OK", { status: 200 })),
            Effect.tapError(Effect.logError),
            Effect.tapDefect(Effect.logError),
            Effect.orDie,
            Effect.cachedWithTTL(Duration.hours(1))
        );

        return HttpRouter.add("GET", "/healthz", HealthCheck);
    })
).pipe(Layer.provide([HttpRouter.disableLogger, NimblebitAuth.layerDirectConfig()]));

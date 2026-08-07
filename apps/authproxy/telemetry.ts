import { Config, Effect, Layer, Option, Redacted } from "effect";
import { DevTools } from "effect/unstable/devtools";
import { FetchHttpClient, HttpMiddleware } from "effect/unstable/http";
import { Otlp } from "effect/unstable/observability";

/*
  Where the proxy's telemetry goes.

  Almost none of it is generated here. `HttpEffect` wraps every handler in
  `HttpMiddleware.tracer`, `HttpRouter.serve` installs `HttpMiddleware.logger`,
  and `PgClient` spans its queries, so a request already describes itself as a
  tree of spans with the SQL nested underneath. All that has ever been missing
  is somewhere to send it, which is what this layer picks:

    OTLP_ENDPOINT + OTLP_TOKEN -> Better Stack, over OTLP (logs, metrics, traces)
    DEVTOOLS_URL               -> the Effect devtools client, spans only
    neither                    -> nothing exported, console logging as before

  The two are alternatives rather than a fallback chain because each installs
  its own `Tracer`, and only one of them can win.
*/

const serviceName = "authproxy";

/*
  `/healthz` is polled by App Platform and answers from a one hour cache, so
  tracing it would fill the exporter with spans that describe the cache rather
  than the dependency. The route already opts out of request logging for the
  same reason.
*/
const TracerDisabledLive = HttpMiddleware.layerTracerDisabledForUrls(["/healthz"]);

/*
  Better Stack terminates OTLP at `$INGESTING_HOST/v1/{logs,metrics,traces}`,
  which is exactly the layout `Otlp` appends to `baseUrl`, so the source's
  ingesting host goes in whole and nothing here knows the paths.

  `loggerMergeWithExisting` keeps the console logger installed alongside the
  OTLP one: the same lines stay visible in the App Platform runtime console,
  which is still the first place anyone looks when a deploy misbehaves.
*/
const OtlpLive = (baseUrl: string, token: Redacted.Redacted<string>, environment: string) =>
    Otlp.layerJson({
        baseUrl,
        headers: { authorization: `Bearer ${Redacted.value(token)}` },
        resource: { serviceName, attributes: { "deployment.environment.name": environment } },
        loggerMergeWithExisting: true,
    }).pipe(Layer.provide(FetchHttpClient.layer));

export const TelemetryLive = Layer.unwrap(
    Effect.gen(function* () {
        const endpoint = yield* Config.string("OTLP_ENDPOINT").pipe(Config.option);
        const token = yield* Config.redacted("OTLP_TOKEN").pipe(Config.option);
        const devtools = yield* Config.string("DEVTOOLS_URL").pipe(Config.option);
        const environment = yield* Config.string("NODE_ENV").pipe(Config.withDefault("development"));

        if (Option.isSome(endpoint) && Option.isSome(token)) {
            yield* Effect.logInfo("Exporting telemetry over OTLP").pipe(
                Effect.annotateLogs({ endpoint: endpoint.value, environment })
            );
            return OtlpLive(endpoint.value, token.value, environment);
        }

        /*
          Opt in by setting the variable rather than defaulting to the devtools
          port in development. The client queues spans into an unbounded queue
          and only waits one second for the socket, so pointing it at a port
          nobody is listening on is a leak that starts quietly.
        */
        if (Option.isSome(devtools)) {
            yield* Effect.logInfo("Streaming spans to Effect devtools").pipe(
                Effect.annotateLogs({ url: devtools.value })
            );
            return DevTools.layer(devtools.value);
        }

        return Layer.empty;
    })
).pipe(Layer.merge(TracerDisabledLive));

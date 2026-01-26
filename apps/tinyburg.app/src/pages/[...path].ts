import type { APIContext, APIRoute } from "astro";

import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpServer } from "@effect/platform";
import { Context, Effect, Layer, Schema } from "effect";

/**
 * A Context Reference to access Astro's locals within Effect handlers.
 *
 * This allows us to read and modify the locals object that Astro provides for
 * each request, enabling us to share data between Astro and Effect handlers.
 */
class AstroLocals extends Context.Reference<AstroLocals>()("AstroLocals", {
    defaultValue: () => ({}) as APIContext["locals"],
}) {}

const api = HttpApi.make("myApi").add(
    HttpApiGroup.make("group").add(HttpApiEndpoint.get("get", "/").addSuccess(Schema.String))
);

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
    handlers.handle("get", () =>
        Effect.gen(function* () {
            const locals = yield* AstroLocals;
            console.log("Astro Locals:", locals); // Log the locals to verify access
            return "Hello from Effect API!";
        })
    )
);

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(groupLive));

// Convert the API to a web handler
const { dispose, handler } = HttpApiBuilder.toWebHandler(Layer.mergeAll(MyApiLive, HttpServer.layerContext));

// When the process is interrupted, we want to clean up resources
process.on("SIGTERM", () => {
    dispose().then(
        (_value) => {
            process.exit(0);
        },
        (_reason) => {
            process.exit(1);
        }
    );
});

// Astro API endpoint that allows ANY valid route into the Effect handler
export const ALL: APIRoute = async ({ locals, request }: APIContext) => {
    locals.foo = "bar"; // Example of setting a value in locals
    const localsContext = Context.make(AstroLocals, locals);
    return await handler(request, localsContext);
};

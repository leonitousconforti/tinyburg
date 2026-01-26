import type { APIContext, APIRoute } from "astro";

import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpLayerRouter, HttpServer } from "@effect/platform";
import { Config, Context, Effect, Layer, Schema } from "effect";

export const GoogleOAuthConfig = Config.all({
    clientId: Config.string("GOOGLE_CLIENT_ID"),
    clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    redirectUri: Config.string("GOOGLE_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:4321/api/auth/google/callback")
    ),
});

class AstroLocals extends Context.Tag("AstroLocals")<AstroLocals, APIContext["locals"]>() {}

const api = HttpApi.make("myApi").add(
    HttpApiGroup.make("group").add(HttpApiEndpoint.get("test", "/").addSuccess(Schema.String))
);

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
    handlers.handle("test", () =>
        Effect.gen(function* () {
            const locals = yield* AstroLocals;
            console.log("Astro Locals:", locals);
            return "Hello from Effect API!";
        })
    )
);

const { dispose, handler } = HttpLayerRouter.addHttpApi(api).pipe(
    Layer.provide([groupLive, HttpServer.layerContext]),
    (layer) =>
        layer as Layer.Layer<
            Layer.Layer.Success<typeof layer>,
            Layer.Layer.Error<typeof layer>,
            | Exclude<Layer.Layer.Context<typeof layer>, AstroLocals>
            | HttpLayerRouter.Request.From<"Requires", AstroLocals>
        >,
    (layer) => HttpLayerRouter.toWebHandler(layer, { disableLogger: true })
);

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

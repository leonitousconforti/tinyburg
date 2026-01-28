// import type { APIContext, APIRoute } from "astro";

// import { HttpApi, HttpLayerRouter, HttpServer } from "@effect/platform";
// import { Context, Layer } from "effect";

// import { AppLive, AppRuntime } from "../../api/runtime.ts";
// import { AstroContext } from "../../api/tags";
// import { GoogleCallbackHandler, GoogleLoginHandler } from "../../routes/oauth/google.ts";

// class Api extends HttpApi.make("TinyburgAppApi") {}

// const { dispose, handler } = HttpLayerRouter.addHttpApi(Api).pipe(
//     Layer.provide([GoogleLoginHandler, GoogleCallbackHandler]),
//     Layer.provide([HttpServer.layerContext, AppLive]),
//     (layer) =>
//         HttpLayerRouter.toWebHandler(layer, {
//             disableLogger: true,
//             memoMap: AppRuntime.memoMap,
//         })
// );

// // When the process is interrupted, we want to clean up resources
// process.on("SIGTERM", () => {
//     dispose().then(
//         (_value) => {
//             process.exit(0);
//         },
//         (_reason) => {
//             process.exit(1);
//         }
//     );
// });

// // Astro API endpoint that allows ANY valid route into the Effect handler
// export const ALL: APIRoute = async (context: APIContext) => {
//     const astro = Context.make(AstroContext, context);
//     return await handler(context.request, astro);
// };

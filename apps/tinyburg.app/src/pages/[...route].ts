import { Context, Layer } from "effect";
import { Etag, HttpPlatform, HttpRouter, HttpServerResponse } from "effect/unstable/http";

import type { APIRoute } from "astro";

import { AstroContext } from "../../api/context.ts";
import { AppLive, AppRuntime } from "../../api/runtime.ts";
import { OidcApiLive } from "./oauth/_oidc.ts";

const RouteMissFallback = HttpRouter.add(
    "*",
    "*",
    HttpServerResponse.empty({
        status: 404,
        headers: {
            "x-route-miss": "1",
        },
    })
).pipe(Layer.merge(HttpRouter.disableLogger));

const ApiLive = Layer.mergeAll(OidcApiLive, Layer.empty).pipe(
    Layer.merge(RouteMissFallback),
    Layer.provide(Layer.mergeAll(HttpPlatform.layer, Etag.layer)),
    Layer.provideMerge(AppLive)
);

const webHandler = HttpRouter.toWebHandler(ApiLive, {
    memoMap: AppRuntime.memoMap,
    disableLogger: true,
});

export const ALL: APIRoute = async (apiContext) => {
    const context = Context.make(AstroContext, apiContext);
    const response = await webHandler.handler(apiContext.request, context);
    if (response.headers.has("x-route-miss")) {
        return await apiContext.rewrite("/404");
    } else {
        return response;
    }
};

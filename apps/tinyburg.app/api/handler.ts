import { Context, type Effect, type ManagedRuntime, type Scope } from "effect";
import { HttpEffect, type HttpMiddleware, type HttpServerRequest, type HttpServerResponse } from "effect/unstable/http";

import type { APIRoute } from "astro";

import { AstroContext } from "./context";
import { AppRuntime } from "./runtime";

export const makeAstroEndpoint = <
    E,
    R extends
        | ManagedRuntime.ManagedRuntime.Services<typeof AppRuntime>
        | HttpServerRequest.HttpServerRequest
        | AstroContext
        | Scope.Scope,
>(
    httpEffect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>,
    middleware?: HttpMiddleware.HttpMiddleware | undefined
): APIRoute => {
    let cachedHandler: (request: Request, context: Context.Context<AstroContext>) => Promise<Response> = undefined!;

    return async (apiContext) => {
        const runtime = await AppRuntime.context();
        cachedHandler ??= HttpEffect.toWebHandlerWith<
            ManagedRuntime.ManagedRuntime.Services<typeof AppRuntime>,
            R,
            AstroContext
        >(runtime)(httpEffect, middleware);
        const context = Context.make(AstroContext, apiContext);
        return await cachedHandler(apiContext.request, context);
    };
};

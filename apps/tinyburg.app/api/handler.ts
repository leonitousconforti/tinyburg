import { Cause, Context, Effect, type ManagedRuntime, type Scope } from "effect";
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
    const failures = new WeakMap<Request, Cause.Cause<unknown>>();

    const captured = Effect.tapCause(httpEffect, (cause) =>
        Cause.hasInterruptsOnly(cause)
            ? Effect.void
            : AstroContext.use((astro) => {
                  failures.set(astro.request, cause);
                  return Effect.void;
              })
    );

    return async (apiContext) => {
        const runtime = await AppRuntime.context();
        cachedHandler ??= HttpEffect.toWebHandlerWith<
            ManagedRuntime.ManagedRuntime.Services<typeof AppRuntime>,
            R | AstroContext,
            AstroContext
        >(runtime)(captured, middleware);
        const context = Context.make(AstroContext, apiContext);
        const response = await cachedHandler(apiContext.request, context);
        const cause = failures.get(apiContext.request);
        if (cause !== undefined) throw Cause.squash(cause);
        return response;
    };
};

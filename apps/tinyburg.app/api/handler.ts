import { Context, Effect, type ManagedRuntime, type Scope, Cause } from "effect";
import { HttpEffect, type HttpMiddleware, type HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import type { APIRoute } from "astro";

import { experimental_AstroContainer as AstroContainer } from "astro/container";

// @ts-ignore
import Page500 from "../src/pages/500.astro";
import { AppRuntime } from "./runtime";
import { AstroContext } from "./tags";

export const render500 = <E, R>(
    httpEffect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
    Effect.catchCause(httpEffect, (cause) =>
        Effect.promise(async () => {
            const container = await AstroContainer.create();
            const error = Cause.prettyErrors(cause)[0];
            const html = await container.renderToString(Page500, { props: { error } });
            return HttpServerResponse.html(html).pipe(HttpServerResponse.setStatus(500));
        })
    );

export const makeAstroEndpoint = <
    E,
    R extends
        | ManagedRuntime.ManagedRuntime.Services<typeof AppRuntime>
        | Scope.Scope
        | HttpServerRequest.HttpServerRequest
        | AstroContext,
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

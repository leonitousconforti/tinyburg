import { HttpApp, type HttpMiddleware, type HttpServerRequest } from "@effect/platform";
import { type APIRoute } from "astro";
import { Context, Effect, type ManagedRuntime, type Scope } from "effect";

import { AppRuntime } from "./runtime";
import { AstroContext } from "./tags";

export const makeAstroEndpoint = <E>(
    app: HttpApp.Default<
        E,
        | AstroContext
        | Scope.Scope
        | HttpServerRequest.HttpServerRequest
        | ManagedRuntime.ManagedRuntime.Context<typeof AppRuntime>
    >,
    middleware?: HttpMiddleware.HttpMiddleware | undefined
): APIRoute => {
    type R = ManagedRuntime.ManagedRuntime.Context<typeof AppRuntime>;

    let cachedHandler:
        | ((request: Request, context?: Context.Context<never> | undefined) => Promise<Response>)
        | undefined = undefined;

    const appWithoutAstroContext = Effect.mapInputContext(
        app,
        (requiredContext: Context.Context<Scope.Scope | HttpServerRequest.HttpServerRequest | R>) =>
            Context.merge(requiredContext, Context.empty() as Context.Context<AstroContext>)
    );

    return async (apiContext) => {
        const runtime = await AppRuntime.runtime();
        cachedHandler ??= HttpApp.toWebHandlerRuntime(runtime)(appWithoutAstroContext, middleware);
        const context = Context.make(AstroContext, apiContext);
        return await cachedHandler(apiContext.request, context);
    };
};

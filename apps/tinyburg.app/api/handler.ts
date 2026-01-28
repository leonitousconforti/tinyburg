import { HttpApp, type HttpMiddleware, type HttpServerRequest } from "@effect/platform";
import { type APIRoute } from "astro";
import { Context, Effect, type ManagedRuntime, type Scope } from "effect";

import { AppRuntime } from "./runtime";
import { AstroContext } from "./tags";

export const makeAstroEndpoint = async <E>(
    app: HttpApp.Default<E, AstroContext | Scope.Scope | ManagedRuntime.ManagedRuntime.Context<typeof AppRuntime>>,
    middleware?: HttpMiddleware.HttpMiddleware | undefined
): Promise<APIRoute> => {
    const runtime = await AppRuntime.runtime();
    const emptyAstroContext = Context.empty() as Context.Context<AstroContext>;
    const appWithoutAstroContext = Effect.mapInputContext(
        app,
        (
            requiredContext: Context.Context<
                | Scope.Scope
                | HttpServerRequest.HttpServerRequest
                | ManagedRuntime.ManagedRuntime.Context<typeof AppRuntime>
            >
        ) => Context.merge(requiredContext, emptyAstroContext)
    );
    const handler = HttpApp.toWebHandlerRuntime(runtime)(appWithoutAstroContext, middleware);
    return async (apiContext) => {
        const context = Context.make(AstroContext, apiContext);
        return await handler(apiContext.request, context);
    };
};

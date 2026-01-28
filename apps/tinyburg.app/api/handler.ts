import { HttpApp, type HttpMiddleware } from "@effect/platform";
import { type APIRoute } from "astro";
import { Context, type ManagedRuntime } from "effect";

import { AppRuntime } from "./runtime";
import { AstroContext } from "./tags";

export const makeAstroEndpoint = <E>(
    app: HttpApp.Default<E, AstroContext | ManagedRuntime.ManagedRuntime.Context<typeof AppRuntime>>,
    middleware?: HttpMiddleware.HttpMiddleware | undefined
): APIRoute => {
    return async (apiContext) => {
        const runtime = await AppRuntime.runtime();
        const context = Context.make(AstroContext, apiContext);
        const appAstroContextOmitted = app as HttpApp.Default<E, never>;
        const handler = HttpApp.toWebHandlerRuntime(runtime)(appAstroContextOmitted, middleware);
        return await handler(apiContext.request, context);
    };
};

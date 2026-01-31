import type { APIContext, MiddlewareNext } from "astro";

import { Option } from "effect";
import { AppRuntime } from "../api/runtime";
import { Repository } from "../domain/model";

export const onRequest = async (context: APIContext, next: MiddlewareNext): Promise<Response> => {
    // Can't run on prerendered pages
    if (context.isPrerendered) return await next();

    // Default to no user
    context.locals.account = Option.none();

    // Check for session cookie
    const sessionId = context.cookies.get("session_id")?.value;
    if (sessionId === undefined) return await next();

    // Lookup user by session
    context.locals.account = await AppRuntime.runPromise(Repository.findUserBySession(sessionId));
    return await next();
};

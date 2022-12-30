import fp from "fastify-plugin";
import type { RouteOptions } from "../types/RouteOptions.js";

// Import handlers
import { handler } from "./handler.js";
import { onRequest } from "./onRequest.js";
import { preHandler } from "./preHandler.js";

// Import json schemas
import HeadersSchema from "./../schemas/headers_v1.json";
import ResponseSchema from "./../schemas/response_v1.json";
import QuerystringSchema from "./../schemas/querystring_v1.json";

// Import the generated interfaces
import type { HeadersSchema as HeadersSchemaInterface } from "../types/headers_v1.js";
import type { QuerystringSchema as QuerystringSchemaInterface } from "../types/querystring_v1.js";

// Fastify routing for api v1
const api_v1 = fp.default<RouteOptions>(async (fastify, opts): Promise<void> => {
    fastify.route<{
        Querystring: QuerystringSchemaInterface;
        Headers: HeadersSchemaInterface;
    }>({
        url: opts.url || "/v1",
        method: ["GET", "POST"],

        // Request and reply schema
        schema: {
            headers: HeadersSchema,
            querystring: QuerystringSchema,
            response: ResponseSchema.response,
        },

        // Hooks
        onRequest,
        preHandler,
        handler,
    });

    // Add decorators if necessary
    if (!fastify.hasRequestDecorator("apiKey")) {
        fastify.decorateRequest("apiKey", null);
    }
    if (!fastify.hasRequestDecorator("nimblebitData")) {
        fastify.decorateRequest("nimblebitData", null);
    }
});

export default api_v1;

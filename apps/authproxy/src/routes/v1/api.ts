import fp from "fastify-plugin";

// Import handlers
import { handler } from "./handler.js";
import { onRequest } from "./on-request.js";
import { preHandler } from "./pre-handler.js";

// Import json schemas
/* eslint-disable prettier/prettier */
import HeadersSchema from "../schemas/headers_v1.json" assert { type: "json" };
import QuerystringSchema from "../schemas/querystring_v1.json" assert { type: "json" };
import ResponseSchema from "../schemas/response_v1.json" assert { type: "json" };
/* eslint-enable prettier/prettier */

// Import the generated interfaces
import type { FastifyInstance } from "fastify";
import type { HeadersSchema as HeadersSchemaInterface } from "../types/headers_v1.js";
import type { QuerystringSchema as QuerystringSchemaInterface } from "../types/querystring_v1.js";

// Fastify routing for api v1
// eslint-disable-next-line @rushstack/typedef-var
export const api_v1 = fp<{ url: string }>(
    async (fastify: FastifyInstance, options: { url: string | undefined }): Promise<void> => {
        fastify.route<{
            Querystring: QuerystringSchemaInterface;
            Headers: HeadersSchemaInterface;
        }>({
            url: options.url || "/v1",
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
            fastify.decorateRequest("apiKey", undefined);
        }
        if (!fastify.hasRequestDecorator("nimblebitData")) {
            fastify.decorateRequest("nimblebitData");
        }
    }
);

export default api_v1;

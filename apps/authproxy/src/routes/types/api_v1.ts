import type { FastifyReply, FastifyRequest } from "fastify";
import type { IncomingMessage, Server, ServerResponse } from "http";

import type { HeadersSchema } from "./headers_v1.js";
import type { QuerystringSchema } from "./querystring_v1.js";

export type Request = FastifyRequest<{ Headers: HeadersSchema; Querystring: QuerystringSchema }>;
export type Reply = FastifyReply<
    Server,
    IncomingMessage,
    ServerResponse,
    { Headers: HeadersSchema; Querystring: QuerystringSchema }
>;

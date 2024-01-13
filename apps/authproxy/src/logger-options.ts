import type { ResSerializerReply } from "fastify/types/logger.js";
import type { FastifyLoggerOptions, FastifyReply, FastifyRequest, RawServerDefault } from "fastify";

export const loggerOptions: FastifyLoggerOptions & { redact: string[] } = {
    level: "trace",
    redact: ["req.headers.authorization"],
    serializers: {
        res(
            reply: ResSerializerReply<RawServerDefault, FastifyReply>
        ): ResSerializerReply<RawServerDefault, FastifyReply> {
            return {
                statusCode: reply.statusCode,
            };
        },

        req(request: FastifyRequest) {
            return {
                method: request.method,
                url: request.url,
                headers: request.headers,
                hostname: request.hostname,
                remoteAddress: request.ip,
                remotePort: request.socket.remotePort!,
                nimblebitData: request.nimblebitData,
            };
        },
    },
};

export default loggerOptions;

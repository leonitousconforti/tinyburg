import type { FastifyLoggerOptions } from "fastify";

// According to the docs you can pass the redact option but its not
// in the TypeScript types so... Just gonna patch it in myself
declare module "fastify" {
    interface FastifyLoggerOptions {
        redact: string[] | undefined;
    }
}

const loggerOptions: FastifyLoggerOptions = {
    level: "trace",
    redact: ["req.headers.authorization"],
    serializers: {
        res(reply) {
            // The default
            return {
                statusCode: reply.statusCode,
            };
        },
        req(request) {
            return {
                method: request.method,
                url: request.url,
                headers: request.headers,
                hostname: request.hostname,
                remoteAddress: request.ip,
                remotePort: request.socket.remotePort,
                clientIp: request.clientIP,
                nimblebitData: request.nimblebitData,
            };
        },
    },
};

export default loggerOptions;

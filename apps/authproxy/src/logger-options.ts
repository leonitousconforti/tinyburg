import type { FastifyLoggerOptions } from "fastify";

const loggerOptions: FastifyLoggerOptions & { redact: string[] } = {
    level: "trace",
    redact: ["req.headers.authorization"],
    serializers: {
        // eslint-disable-next-line @typescript-eslint/typedef
        res(reply) {
            return {
                statusCode: reply.statusCode,
            };
        },
        // eslint-disable-next-line @typescript-eslint/typedef
        req(request) {
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

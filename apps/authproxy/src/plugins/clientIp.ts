import type { FastifyRequest } from "fastify";

import fp from "fastify-plugin";

export interface ClientIpPluginOptions {
    // Specify ClientIp plugin options here
    header?: string;
    addHook: boolean;
}

// The use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp.default<ClientIpPluginOptions>(async (fastify, opts) => {
    // Determines the client's ip
    const getClientIp = function (request: FastifyRequest): string {
        let clientIp = request.ip;

        if (opts.header) {
            let headerValue = request.headers[opts.header];
            request.log.debug(
                { req: request, headerValue },
                `Parsed client ip from header: ${opts.header} -> ${headerValue}`
            );

            if (Array.isArray(headerValue)) {
                headerValue = headerValue[0];
                request.log.debug(
                    { req: request, headerValue },
                    `Header: ${opts.header} was an array, using first value`
                );
            }

            clientIp = headerValue || clientIp;
        }

        request.log.debug({ req: request, clientIp }, `Final client ip is: ${clientIp}`);
        return clientIp;
    };

    // Decorator to call the getClientIp function
    fastify.decorateRequest("getClientIp", getClientIp);

    // Add a hook to set the client ip on every request
    if (opts.addHook) {
        fastify.addHook("onRequest", async function (request) {
            request.clientIP = getClientIp(request);
        });
    }
});

// When using .decorate you have to specify added properties for Typescript
declare module "fastify" {
    export interface FastifyRequest {
        getClientIp(): string;
        clientIP: string;
    }
}

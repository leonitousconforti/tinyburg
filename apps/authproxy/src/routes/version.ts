import type { FastifyPluginAsync } from "fastify";

const version: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.route({
        url: "/version",
        method: ["GET"],

        // eslint-disable-next-line @typescript-eslint/naming-convention
        handler: (_request, _reply) =>
            `Running in NODE_ENV -> ${process.env["NODE_ENV"]}\nRunning from GIT_SHA -> ${process.env["GIT_SHA"]}`,
    });
};

export default version;

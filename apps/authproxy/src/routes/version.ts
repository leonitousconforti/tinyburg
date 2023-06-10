import type { FastifyPluginAsync } from "fastify";

const version: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.route({
        url: "/version",
        method: ["GET"],

        // eslint-disable-next-line @typescript-eslint/naming-convention
        handler: async (_request, reply) => {
            await reply.status(200);
            reply.raw.write(`Running in NODE_ENV -> ${process.env["NODE_ENV"] || "unknown"}\n`);
            reply.raw.write(`Running from GIT_SHA -> ${process.env["GIT_SHA"] || "unknown"}`);
            reply.raw.end();
        },
    });
};

export default version;

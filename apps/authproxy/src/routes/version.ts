import type { FastifyPluginAsync } from "fastify";

const version: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.route({
        url: "/version",
        method: ["GET"],

        handler: (_request, reply) => {
            reply.status(200);
            reply.raw.write(`Running in NODE_ENV -> ${process.env["NODE_ENV"] || "I can't find that?!?"}\n`);
            reply.raw.write(`Running from GIT_SHA -> ${process.env["GIT_SHA"] || "idk :("}`);
            reply.raw.end();
        },
    });
};

export default version;

import type { FastifyReply } from "fastify";

import fp from "fastify-plugin";

type a = typeof fp;

// The use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp(async (fastify) => {
    // Decorator to call the badRequest function
    fastify.decorateReply("badRequest", function (this: FastifyReply, error: string) {
        return this.status(400).send(new Error(error));
    });
});

// When using .decorate you have to specify added properties for Typescript
declare module "fastify" {
    export interface FastifyReply {
        badRequest(error: string): void;
    }
}

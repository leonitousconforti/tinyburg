import fastify from "fastify";
import type { ApiKey } from "../../entity/api-key.js";

export interface INimblebitData {
    salt: number;
    endpoint: string;
    playerId: string;
    playerSs: string;
    finalHash: string;
    finalUrl: string;
}

declare module "fastify" {
    interface FastifyRequest {
        apiKey: ApiKey | undefined;
        nimblebitData: INimblebitData;
    }
}

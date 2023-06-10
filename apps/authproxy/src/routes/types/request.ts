// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface FastifyRequest {
        apiKey: ApiKey | undefined;
        nimblebitData: INimblebitData;
    }
}

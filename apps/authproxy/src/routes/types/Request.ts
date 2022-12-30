/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import fastify from "fastify";
import type { ApiKey } from "../../entity/ApiKey.js";

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

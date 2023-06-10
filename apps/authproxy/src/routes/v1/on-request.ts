import type { Request } from "../types/api_v1.js";
import type { INimblebitData } from "../types/request.js";

import { ApiKey } from "../../entity/api-key.js";

// On-request hook to decorate the fastify request object. This is done in the on-request hook to achieve
// proper encapsulation across requests, see: https://www.fastify.io/docs/latest/Reference/Decorators/#decoraterequestname-value-dependencies
export const onRequest = async function (request: Request): Promise<void> {
    request.log.debug({ req: request }, "onRequest hook fired");

    // Set the api key id
    const key = request.headers.authorization?.replace("Bearer ", "").trim();
    const apiKeyObject = await ApiKey.findOne({ where: { apiKey: key } });
    request.apiKey = apiKeyObject;

    // Reset the nimblebit data
    request.nimblebitData = {} as INimblebitData;
    request.log.debug({ req: request }, "onRequest hook finished");
};

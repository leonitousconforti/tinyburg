import got from "got";
import * as crypto from "crypto";
import { secretSalt } from "../../constants.js";
import type { Request, Reply } from "../types/api_v1";
import type { INimblebitResponse } from "../types/NimblebitResponse.js";
import { serverEndpoints as scopes } from "tinyburg/contact-server.js";

// Handles the request by proxing to nimblebit's server
export const handler = async function (request: Request, reply: Reply) {
    request.log.debug({ req: request }, "handler hook fired");
    const { playerId, salt, playerSs } = request.nimblebitData;

    // Make the request
    const nimblebitResponse = await got<INimblebitResponse>(request.nimblebitData.finalUrl, {
        responseType: "json",
        method: request.method === "GET" ? "GET" : "POST",
        form: request.method === "POST" ? (request.body as Record<string, unknown>) : undefined,
    });
    request.log.info({ nimblebitResponse, req: request }, "Nimblebit request sent");

    // Check for special endpoints that need a proxied hash as well - current save version
    if (request.nimblebitData.endpoint === scopes.check_for_newer_save) {
        const hashString = playerId + salt + nimblebitResponse.body.id + playerSs;
        nimblebitResponse.body.proxiedHash = crypto
            .createHash("md5")
            .update(hashString)
            .update(secretSalt)
            .digest("hex");
    }

    // Check for special endpoints that need a proxied hash as well - download save
    if (request.nimblebitData.endpoint === scopes.pull_save) {
        const hashString = playerId + salt + nimblebitResponse.body.id + nimblebitResponse.body.data + playerSs;
        nimblebitResponse.body.proxiedHash = crypto
            .createHash("md5")
            .update(hashString)
            .update(secretSalt)
            .digest("hex");
    }

    // Return the response with proper status code
    reply.status(nimblebitResponse.statusCode).send(JSON.stringify(nimblebitResponse.body));
    request.log.debug({ req: request }, "handler hook finished");
};

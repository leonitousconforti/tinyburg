import type { Request, Reply } from "../types/api_v1.js";
import type { IDownloadSave } from "@tinyburg/core/endpoints/download-save";
import type { INimblebitResponse } from "@tinyburg/core/endpoints/nimblebit-response";
import type { ICheckForNewerSave } from "@tinyburg/core/endpoints/check-for-newer-save";

import got from "got";
import { secretSalt } from "../../constants.js";
import { serverEndpoints, defaultHeaders } from "@tinyburg/core/contact-server";
import { computeDownloadSaveValidationHash } from "@tinyburg/core/endpoints/download-save";
import { computeCheckForNewerSaveValidationHash } from "@tinyburg/core/endpoints/check-for-newer-save";

// Handles the request by proxying to nimblebit's server
export const handler = async function (request: Request, reply: Reply): Promise<void> {
    request.log.debug({ req: request }, "handler hook fired");
    const { playerId, salt, playerSs, finalUrl, endpoint } = request.nimblebitData;

    // Make the request
    const nimblebitResponse = await got<INimblebitResponse>(finalUrl, {
        responseType: "json",
        headers: defaultHeaders,
        method: request.method === "GET" ? "GET" : "POST",
        form: request.method === "POST" ? (request.body as Record<string, unknown>) : undefined,
    });
    request.log.info({ nimblebitResponse, req: request }, "Nimblebit request sent");

    // Check for special endpoints that need a proxied hash as well - current save version
    if (endpoint === serverEndpoints.checkForNewerSave) {
        nimblebitResponse.body.proxiedHash = computeCheckForNewerSaveValidationHash({
            playerId,
            playerSs,
            salt,
            secretSalt,
            saveVersionAtNimblebit: (nimblebitResponse.body as ICheckForNewerSave).id,
        });
    }

    // Check for special endpoints that need a proxied hash as well - download save
    if (endpoint === serverEndpoints.pullSave) {
        nimblebitResponse.body.proxiedHash = computeDownloadSaveValidationHash({
            playerId,
            playerSs,
            salt,
            secretSalt,
            saveVersionAtNimblebit: (nimblebitResponse.body as IDownloadSave).id,
            saveData: (nimblebitResponse.body as IDownloadSave).data,
        });
    }

    // Return the response with proper status code
    await reply.status(nimblebitResponse.statusCode).send(JSON.stringify(nimblebitResponse.body));
    request.log.debug({ req: request }, "handler hook finished");
};

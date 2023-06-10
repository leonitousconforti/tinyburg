import type { Request, Reply } from "../types/api_v1.js";
import type { Scope } from "../../auth/scope-permission.js";

import crypto from "node:crypto";
import { secretSalt } from "../../constants.js";
import { serverEndpoints } from "@tinyburg/core/contact-server";
import { hasScopePermission } from "../../auth/scope-permission.js";

// Pre-handler hook to parse query params
export const preHandler = async function (request: Request, reply: Reply): Promise<void> {
    request.log.debug({ req: request }, "perHandler hook fired");

    // Parse query params
    const hash = request.query.hash;
    const endpoint = request.query.endpoint;
    request.log.info({ req: request, hash, endpoint }, "Parsed query params");

    // Check the hash split array
    const hashSplit = hash.split("/");
    if (hashSplit.length !== 3) {
        return reply.badRequest(`Expected 3 parts in hash param, received: ${hashSplit.length} parts`);
    }

    // Parse playerId, playerSs, and salt from the hash
    const playerId = hashSplit[1]!;
    const playerSs = hashSplit[2]!.slice(-36);
    const salt = hashSplit[2]!.replace(playerSs, "").match(/^-?\d+/gim)?.[0];
    request.log.info({ playerId, playerSs }, "Parsed playerId + playerSs");

    // Check that the salt param is a 32bit signed integer
    request.log.info("Testing salt...");
    if (!salt || Number.parseInt(salt) < 0 || Number.parseInt(salt) > 1) {
        return reply.badRequest("Salt param was not a valid 32bit signed integer");
    }
    const saltNumber = Number.parseInt(salt);
    request.log.info({ req: request, saltNumber }, "Salt was a 32-bit signed integer");

    // Parse the nimblebit url from the endpoint by removing the salt and playerId
    const nimblebitEndpoint = endpoint.replace(playerId, "").replace(saltNumber.toString(), "").replace("//", "/");
    request.log.info({ req: request, nimblebitEndpoint }, "Crafting nimblebit target endpoint...");

    // Check the scope
    request.log.info({ req: request }, "Checking scope permissions");
    if (hasScopePermission(request.apiKey, nimblebitEndpoint as (typeof serverEndpoints)[Scope])) {
        const finalHash = crypto.createHash("md5").update(hash).update(secretSalt).digest("hex");
        const finalUrl = "https://sync.nimblebit.com" + endpoint + "/" + finalHash;

        request.nimblebitData = {
            salt: saltNumber,
            endpoint: nimblebitEndpoint,
            playerId,
            playerSs,
            finalUrl,
            finalHash,
        };
        request.log.info({ req: request }, "Success! sending nimblebit data to handler");
    } else {
        request.log.error({ req: request }, `Permission to access scope ${nimblebitEndpoint} has been denied`);
        return reply.status(403).send(new Error("You do not have permission to access scope: " + nimblebitEndpoint));
    }

    request.log.debug({ req: request }, "preHandler request finished");
    return;
};

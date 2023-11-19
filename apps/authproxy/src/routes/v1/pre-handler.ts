import type { Request, Reply } from "../types/api_v1.js";
import type { Scope } from "../../auth/scope-permission.js";

import crypto from "node:crypto";
import { secretSalt } from "../../constants.js";
import { hasScopePermission } from "../../auth/scope-permission.js";

import { parseSalt } from "@tinyburg/core/validation/salt";
import { serverEndpoints } from "@tinyburg/core/contact-server";
import { parseEndpoint } from "@tinyburg/core/validation/endpoint";
import { parsePlayerId } from "@tinyburg/core/validation/player-id";
import { parsePlayerSs } from "@tinyburg/core/validation/player-ss";

// Pre-handler hook to parse query params
export const preHandler = async function (request: Request, reply: Reply): Promise<void> {
    request.log.debug({ req: request }, "preHandler hook fired");

    // Parse query params
    const hash = request.query.hash;
    const endpoint = request.query.endpoint;
    request.log.info({ req: request, hash, endpoint }, "Parsed query params");

    // Check the hash split array
    const hashSplit = hash.split("/");
    if (hashSplit.length !== 3) {
        return reply.status(400).send(new Error(`Expected 3 parts in hash param, received: ${hashSplit.length} parts`));
    }

    // Parse playerId, playerSs, and salt from the hash
    const playerId = parsePlayerId(hashSplit[1]!);
    const playerSs = parsePlayerSs(hashSplit[2]!.slice(-36));
    const salt = parseSalt(hashSplit[2]!.replace(playerSs, "").match(/^-?\d+/gim)?.[0]);
    request.log.info({ playerId, playerSs }, "Parsed playerId + playerSs");

    // Parse the nimblebit url from the endpoint by removing the salt and playerId
    const nimblebitEndpoint = parseEndpoint(
        endpoint.replace(playerId, "").replace(salt.toString(), "").replace("//", "/")
    );
    request.log.info({ req: request, nimblebitEndpoint }, "Crafting nimblebit target endpoint...");

    // Check the scope
    request.log.info({ req: request }, "Checking scope permissions");
    if (hasScopePermission(request.apiKey, nimblebitEndpoint as (typeof serverEndpoints)[Scope])) {
        const finalHash = crypto.createHash("md5").update(hash).update(secretSalt).digest("hex");
        const finalUrl = "https://sync.nimblebit.com" + endpoint + "/" + finalHash;

        request.nimblebitData = {
            salt,
            playerId,
            playerSs,
            finalUrl,
            finalHash,
            endpoint: nimblebitEndpoint,
        };
        request.log.info({ req: request }, "Success! sending nimblebit data to handler");
    } else {
        request.log.error({ req: request }, `Permission to access scope ${nimblebitEndpoint} has been denied`);
        return reply.status(403).send(new Error("You do not have permission to access scope: " + nimblebitEndpoint));
    }

    request.log.debug({ req: request }, "preHandler request finished");
    return;
};

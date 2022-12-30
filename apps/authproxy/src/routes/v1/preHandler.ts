import * as crypto from "crypto";
import { secretSalt } from "../../constants.js";
import type { Request, Reply } from "../types/api_v1.js";
import { hasScopePermission } from "../../auth/scopePermission.js";

// Pre-handler hook to parse query params
export const preHandler = async function (request: Request, reply: Reply) {
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
    const playerId = hashSplit[1];
    const playerSs = hashSplit[2].slice(-36);
    const salt = hashSplit[2].replace(playerSs, "").match(/^-?\d+/gim);
    request.log.info({ playerId, playerSs }, "Parsed playerId + playerSs");

    // Check that the salt param is a 32bit signed integer
    // https://stackoverflow.com/questions/2282452/determine-if-conversion-from-string-to-32-bit-integer-will-overflow
    request.log.info("Testing salt...");
    if (!salt || parseInt(salt[0]) >> 0 != parseInt(salt[0])) {
        return reply.badRequest("Salt param was not a valid 32bit signed integer");
    }

    // salt passed
    const saltNumber = parseInt(salt[0]);
    request.log.info({ req: request, saltNumber }, "Salt was a 32-bit signed integer");

    // Parse the nimblebit url from the endpoint by removing the salt and playerId
    const nimblebitEndpoint = endpoint.replace(playerId, "").replace(saltNumber.toString(), "").replace("//", "/");
    request.log.info({ req: request, nimblebitEndpoint }, "Crafting nimblebit target endpoint...");

    // Check the scope
    request.log.info({ req: request }, "Checking scope permissions");
    if (hasScopePermission(request.apiKey, nimblebitEndpoint)) {
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

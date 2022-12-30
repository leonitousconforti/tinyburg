import type { ITTConfig } from "../tt-config.js";
import type { IGift } from "../parsing-structs/gift.js";
import type { INimblebitResponse, SuccessFoundNotFound } from "./nimblebit-response.js";

import { cryptoSalt } from "../crypto-salt.js";
import { DebugLogger, ILogger } from "../logger.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace = "tinyburg:endpoints:gifts";
const debug = new DebugLogger(loggingNamespace);

// Receive gift function params.
export interface IReceiveGiftParameters {
    /**
     * The gift to mark as received.
     */
    gift: IGift;
}

// Nimblebit api get gifts response type.
export interface IGifts extends SuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    /**
     * List of gifts that have been sent to you.
     */
    gifts: IGift[];

    /**
     * The total number of gifts received.
     */
    total: number;
}

// Nimblebit api receive gift response type.
export interface IReceiveGift extends INimblebitResponse {
    success?: "Received" | "NotReceived";
}

// Retrieves all the gifts waiting for you.
export const getGifts = async (config: ITTConfig, logger: ILogger = debug): Promise<IGifts> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Retrieving gifts for player: %s", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The get gifts request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/get_gifts/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.get_gifts + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IGifts>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response, compute validation hashes here somehow?
    if (serverResponse.success === "Found") {
        logger.info("Success, you have %s gifts waiting!", serverResponse.total);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Marks a gift as received so it is removed from your feed.
export const receiveGift = async (
    config: ITTConfig,
    { gift }: IReceiveGiftParameters,
    logger: ILogger = debug
): Promise<IReceiveGift> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Marking gift: %s as received", gift.gift_id);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The receive gift request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/receive_item/tt/{playerId}/{gift_id}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{gift_id}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + gift.gift_id + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.receive_gift + config.player.playerId + "/" + gift.gift_id + "/" + salt;
    const serverResponse = await getNetworkRequest<IReceiveGift>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Received") {
        logger.info("Success, marked gift: %s as received", gift.gift_id);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

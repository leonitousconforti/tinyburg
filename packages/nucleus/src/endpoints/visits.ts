import type { ILogger } from "../logger.js";
import type { IConfig } from "../config.js";
import type { IGift } from "../parsing-structs/gift.js";
import type { INimblebitResponse, ISuccessFoundNotFound } from "./nimblebit-response.js";

import { sendItem } from "./send-item.js";
import { DebugLogger } from "../logger.js";
import { extract } from "../modify-save.js";
import { cryptoSalt } from "../crypto-salt.js";
import { downloadSave } from "./download-save.js";
import { isValidPlayerId } from "../validation/player-id.js";
import { SyncItemType } from "../parsing-structs/sync-item.js";
import { getNetworkRequest, serverEndpoints } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:visits";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Visit player function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisitPlayerParameters = {
    friend: string;
};

// Nimblebit api visit friend response type.
export interface IVisitFriend extends INimblebitResponse {
    success?: "Sent" | "NotSent";
}

// Nimblebit api get visits response type.
export interface IVisits extends ISuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    /** List of gifts that have been sent to you. */
    gifts: IGift[];

    /** The total number of gifts received. */
    total: number;
}

// Visits a player and leaves your doorman so they can visit back.
export const visitFriend = async (
    config: IConfig,
    { friend }: VisitPlayerParameters,
    logger: ILogger = debug
): Promise<IVisitFriend> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Visiting %s...", friend);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Check friend id
    if (!isValidPlayerId(friend)) {
        return logger.fatal(new Error("Invalid friend code"));
    }

    // Download the players save for their doorman
    const downloadedSave = await downloadSave(config, passLogger);
    const doorman = await extract(downloadedSave, "doorman");

    // Visiting is the same as sending your doorman as a Visit item
    return sendItem(config, { itemType: SyncItemType.Visit, sendTo: friend, item: doorman }, passLogger);
};

// Returns a list of players who has visited you that you have not received.
export const getVisits = async (config: IConfig, logger: ILogger = debug): Promise<IVisits> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Fetching visit...");

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The get visits request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/get_visits/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.getVisits + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IVisits>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        logger.info("Success, you have %s visits waiting!", serverResponse.total);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

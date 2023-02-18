import type { ITTConfig } from "../tt-config.js";
import type { INimblebitResponse } from "./nimblebit-response.js";

import { cryptoSalt } from "../crypto-salt.js";
import { DebugLogger, ILogger } from "../logger.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:raffle";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api entered raffle response type.
export interface IEnteredRaffle extends INimblebitResponse {
    success?: "Entered" | "NotEntered";
}

// Tinyburg enter raffle and enter multi raffle return type.
export interface IEnterRaffle extends IEnteredRaffle {
    /** How many minutes until the next available entry time. */
    nextEntryTime: number;
}

// Enters a player into the current hourly raffle drawing.
export const enterRaffle = async (config: ITTConfig, logger: ILogger = debug): Promise<IEnterRaffle> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Entering raffle for player %s...", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The enter raffle request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/raffle/enter/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.enter_raffle + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IEnteredRaffle>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Entered") {
        const nextEntry = 60 - new Date().getMinutes();
        logger.info("Player has been entered into hourly raffle, next available entry in %s mins", nextEntry);
        return { ...serverResponse, nextEntryTime: nextEntry };
    }

    return logger.fatal(new Error("Bad server response"));
};

// Enters a player into the multi raffle (next 8 raffles).
export const enterMultiRaffle = async (config: ITTConfig, logger: ILogger = debug): Promise<IEnterRaffle> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Entering multi-raffle for player %s...", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The enter multi-raffle request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/raffle/enter_multi/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.enter_multi_raffle + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IEnteredRaffle>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good Response
    if (serverResponse.success === "Entered") {
        const nextEntry = 9 * 60 - new Date().getMinutes();
        logger.info("Player has been entered into multi-raffle, next available entry in %s mins", nextEntry);
        return { ...serverResponse, nextEntryTime: nextEntry };
    }

    return logger.fatal(new Error("Bad server response"));
};

// Checks if a player is entered in the current raffle drawing.
export const checkEnteredRaffle = async (config: ITTConfig, logger: ILogger = debug): Promise<boolean> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Checking if player %s is entered in current raffle drawing...", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The entered current raffle request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/raffle/entered_current/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.entered_current + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IEnteredRaffle>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good responses
    if (serverResponse.success === "Entered") {
        logger.info("Entered in current raffle");
        return true;
    } else if (serverResponse.success === "NotEntered") {
        logger.info("Not entered in current raffle drawing");
        return false;
    }

    return logger.fatal(new Error("Bad server response"));
};

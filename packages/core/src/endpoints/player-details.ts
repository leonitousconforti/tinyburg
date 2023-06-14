import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";
import type { ICheckForNewerSave } from "./check-for-newer-save.js";
import type { INimblebitResponse, ISuccessFoundNotFound } from "./nimblebit-response.js";

import { DebugLogger } from "../logger.js";
import { cryptoSalt } from "../crypto-salt.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:player-details";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api player details response type.
export interface IPlayerDetails extends ISuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    player: {
        email: string;
        player_id: string;
        registered: boolean;
        blacklisted: boolean;
    } & ICheckForNewerSave;
}

// Enters a player into the current hourly raffle drawing.
export const playerDetails = async (config: ITTConfig, logger: ILogger = debug): Promise<IPlayerDetails["player"]> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Retrieving player details for player %s...", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The player details request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/player_details/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.player_details + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IPlayerDetails>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        return serverResponse.player;
    }

    return logger.fatal(new Error("Bad server response"));
};

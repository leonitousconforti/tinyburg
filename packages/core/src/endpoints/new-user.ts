import type { ITTConfig } from "../tt-config.js";

import { cryptoSalt } from "../crypto-salt.js";
import { DebugLogger, ILogger } from "../logger.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:new-user";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api new user response type.
export interface INewUser {
    error?: string;
    player_id: string;
    player_email: string;
}

// Request a new user from nimblebit's servers.
export const newUser = async (config: ITTConfig, logger: ILogger = debug): Promise<INewUser> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Contacting Nimblebit server for TinyTower new user creation...");

    // The new user request does not follow the same authentication process as most other endpoints.
    // The endpoint url will be https://sync.nimblebit.com/register/tt/{salt1}/{salt2}/{hash} where
    //
    // salt1 is a random 32bit signed integer, [-2147483648 to 2147483647]
    // salt2 is a different random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{salt1}/{salt2} + {secretSalt}
    const salt1 = cryptoSalt(passLogger);
    const salt2 = cryptoSalt(passLogger);
    const hash = "tt/" + salt1 + "/" + salt2;
    const endpoint = serverEndpoints.new_user + salt1 + "/" + salt2;
    const serverResponse = await getNetworkRequest<INewUser>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response (there is no success property in this response)
    logger.info("New TinyTower login credentials: %O", serverResponse);
    return serverResponse;
};

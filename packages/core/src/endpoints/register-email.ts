import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";
import type { INimblebitResponse } from "./nimblebit-response.js";

import { DebugLogger } from "../logger.js";
import { cryptoSalt } from "../crypto-salt.js";
import { serverEndpoints, postNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:register-email";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api register email response type.
export interface IRegisterEmail extends INimblebitResponse {
    success?: "NewDevice" | "NewEmail";
}

// Requests that nimblebit send a verification code to your cloud sync email address.
export const registerEmail = async (config: ITTConfig, logger: ILogger = debug): Promise<IRegisterEmail> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Starting register email workflow");

    // Validate the user email
    if (!config.player.playerEmail || !isValidEmailAddress(config.player.playerEmail)) {
        return logger.fatal(new Error("Invalid email address in config"));
    }

    // Construct the post data object
    const postData = { email: config.player.playerEmail, promote: 1 };

    // The register email request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/register_email/tt/{burnBotId}/{salt}/{hash} where
    //
    // burnBotId is the burnBotId id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{burnBotId}/{salt} + {playerEmail} + {burnBotSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const endpoint = serverEndpoints.register_email + config.burnBot.playerId + "/" + salt;
    const hash = "tt/" + config.burnBot.playerId + "/" + salt + config.player.playerEmail + config.burnBot.playerSs;
    const serverResponse = await postNetworkRequest<IRegisterEmail>({
        config,
        endpoint,
        hash,
        postData,
        log: passLogger,
    });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "NewDevice") {
        logger.info("Email registration success, check email for 4 digit verification code");
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Validates a player email, most conform to RFC2822. Regex is from https://regexr.com/2rhq7
export const isValidEmailAddress = (email: string): boolean => {
    const emailRegex =
        /[\d!#$%&'*+/=?^_`a-z{|}~-]+(?:\.[\d!#$%&'*+/=?^_`a-z{|}~-]+)*@(?:[\da-z](?:[\da-z-]*[\da-z])?\.)+[\da-z](?:[\da-z-]*[\da-z])?/g;
    return emailRegex.test(email);
};

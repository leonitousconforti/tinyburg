import type { ILogger } from "../logger.js";
import type { IConfig } from "../config.js";
import type { INimblebitResponse } from "./nimblebit-response.js";

import got from "got";
import { DebugLogger } from "../logger.js";
import { serverEndpoints, defaultHeaders } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:register_email";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Verify device function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VerifyDeviceParameters = {
    /** The 4 digit verification code sent to you in an email from Nimblebit. */
    verificationCode: string;
};

// Nimblebit api verify device response type.
export interface IVerifyDevice extends INimblebitResponse {
    /** PlayerId of the player signing in. */
    player_id: string;

    /** PlayerSs of the player signing in. */
    player_ss: string;

    /** PlayerEmail of the player signing in. */
    player_email: string;

    /** Profile photo of the player signing in (always empty). */
    player_photo?: string;

    /** Nickname of the player signing in (always empty). */
    player_nickname?: string;

    /** On success, this endpoint responds with "NewDevice". */
    success?: "NewDevice";
}

// Sends a verification code to nimblebit to verify your device.
export const verifyDevice = async (
    config: IConfig,
    { verificationCode }: VerifyDeviceParameters,
    logger: ILogger = debug
): Promise<IVerifyDevice> => {
    // Setup logging
    logger.info("Starting device verification workflow with code: %s", verificationCode);

    // Validate the verification code param
    if (!isValidVerificationCode(verificationCode)) {
        return logger.fatal(new Error("Invalid verification code"));
    }

    // The verify device request does not follow the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/verify_device/tt/{burnBotId}/{verificationCode} where
    //
    // burnBotId is the cloud player id of the burn bot used for the register email endpoint
    const endpoint = serverEndpoints.verifyDevice + config.burnBot.playerId + "/" + verificationCode;
    const url = new URL(endpoint, config.nimblebitHost);
    const serverResponse = await got.get(url, { headers: defaultHeaders }).json<IVerifyDevice>();

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "NewDevice") {
        // https://eslint.org/docs/latest/rules/require-atomic-updates
        if (!config.authenticated) config.authenticated = true;
        config.player.playerSs = serverResponse.player_ss;

        logger.info("Device verification success, playerSs is %s", serverResponse.player_ss);
        logger.info("updated config to: %O", config);
        logger.info("player fully authenticated, consider saving the config to the filesystem");
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Validates a verification code, must be 4 characters long A-z 0-9
export const isValidVerificationCode = (verificationCode: string): boolean => {
    if (verificationCode.match(/^([\dA-Za-z]){4}$/gm) === null) {
        return false;
    }

    return true;
};

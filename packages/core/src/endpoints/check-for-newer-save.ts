import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";
import type { INimblebitResponse, SuccessFoundNotFound } from "./nimblebit-response.js";

import { DebugLogger } from "../logger.js";
import { cryptoMD5 } from "../crypto-md5.js";
import { cryptoSalt } from "../crypto-salt.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger, will default to using this if no other logger is supplied.
const loggingNamespace = "tinyburg:endpoints:check_for_newer_save";
const debug = new DebugLogger(loggingNamespace);

// Check for newer save function params.
export interface ICheckForNewerSaveParameters {
    /**
     * The current save version you want to compare to.
     */
    saveVersion: number;
}

// Nimblebit api check for newer save response type.
export interface ICheckForNewerSave extends SuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    /**
     * Save version of the most recent cloud save. Save versions are integers starting at 0
     * and incrementing by 1 for each following version.
     */
    id: number;

    /**
     * Validation hash from the server to make sure that the data arrived correctly, computed
     * as: md5(playerId + salt + id + playerSs + secretSalt). The client should compute the same
     * hash client-side using the downloaded data and confirm that they match.
     */
    h: string;
}

// Checks if there is a newer save to download from the cloud.
export const checkForNewerSave = async (
    config: ITTConfig,
    { saveVersion }: ICheckForNewerSaveParameters,
    logger: ILogger = debug
): Promise<number> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Checking for newer save, current save version: %d", saveVersion);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The check for newer save request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/current_version/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is your cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.check_for_newer_save + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<ICheckForNewerSave>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        const saveVersionAtNimblebit = serverResponse.id;
        const validationHashParameters: ICheckForNewerSaveValidationHashParameters = {
            playerId: config.player.playerId,
            salt,
            saveVersionAtNimblebit,
            playerSs: config.player.playerSs,
            secretSalt: config.secretSalt,
        };

        // If the request was made using the auth proxy (because the tinyburg client does not
        // know the secretSalt) then we will use the proxied hash from the authproxy, otherwise
        // compute the validation hash ourselves.
        const serverHash = config.proxy.useProxy
            ? serverResponse.proxiedHash
            : computeCheckForNewerSaveValidationHash(validationHashParameters, passLogger);

        // Confirm that the validation hashes match
        if (serverHash === serverResponse.h) {
            logger.info("Hash verification passed");
            logger.debug("Check for newer save, (local: %d, server: %d", saveVersion, saveVersionAtNimblebit);

            // Check if cloud version is higher
            if (saveVersionAtNimblebit > saveVersion) {
                logger.info("Sync version mismatch, consider downloading newer save data");
                return saveVersionAtNimblebit;
            }

            // Check if local version is higher
            else if (saveVersion > saveVersionAtNimblebit) {
                logger.info("Sync version mismatch), consider uploading your current save");
                return saveVersion;
            }

            logger.info("Sync on current version");
            return 0;
        }

        // Could not verify the validation hash from the server
        return logger.fatal(new Error("Hash verification failed when checking for newer save"));
    }

    return logger.fatal(new Error("Bad server response"));
};

// Compute validation hash function params.
export interface ICheckForNewerSaveValidationHashParameters {
    playerId: string;
    salt: number;
    saveVersionAtNimblebit: number;
    playerSs?: string;
    secretSalt?: string;
}

// Compute the validation hash and confirm that it matches what Nimblebit's api sent.
// The validation hash is computed as: md5(playerId + salt + id + playerSs + secretSalt).
export const computeCheckForNewerSaveValidationHash = (
    { playerId, salt, saveVersionAtNimblebit, playerSs, secretSalt }: ICheckForNewerSaveValidationHashParameters,
    logger: ILogger = debug
): string => {
    const logTag = { forPlayer: playerId, loggingNamespace };
    const passLogger = logger !== debug ? logger : undefined;

    logger.info(logTag, "Computing validation hash with parameters %o", {
        playerId,
        salt,
        saveVersionAtNimblebit,
        playerSs,
        secretSalt,
    });
    return cryptoMD5(playerId + salt + saveVersionAtNimblebit + playerSs + secretSalt, passLogger);
};

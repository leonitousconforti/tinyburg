import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";
import type { INimblebitResponse, ISuccessFoundNotFound } from "./nimblebit-response.js";

import { DebugLogger } from "../logger.js";
import { cryptoMD5 } from "../crypto-md5.js";
import { cryptoSalt } from "../crypto-salt.js";
import { DecompressedSave, decompressSave } from "../decompress-save.js";
import { serverEndpoints, getNetworkRequest } from "../contact-server.js";

// Debug logger, will default to using this if no other logger is supplied.
const loggingNamespace: string = "tinyburg:endpoints:download_save";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api download save response type.
export interface IDownloadSave extends ISuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    /**
     * Save version. Save versions are integer numbers starting at 0 and
     * incrementing by 1 for each following version.
     */
    id: number;

    /**
     * Validation hash from the server to make sure that the data arrived
     * correctly, computed as: md5(playerId + salt + id + data + playerSs +
     * secretSalt). The client should compute the same hash client-side using
     * the downloaded data and confirm that they match.
     */
    h: string;

    /** Compressed save data. */
    data: string;
}

/**
 * Downloads a players save data from the cloud. Will feed the compressed data
 * into the decompress-save module and return the decompressed save data.
 */
export const downloadSave = async (config: ITTConfig, logger: ILogger = debug): Promise<DecompressedSave> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Starting download of current cloud save data...");

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The download save request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/pull/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is your cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.pull_save + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IDownloadSave>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        const saveData = serverResponse.data;
        const saveVersionAtNimblebit = serverResponse.id;
        const validationHashParameters: DownloadSaveValidationHashParameters = {
            playerId: config.player.playerId,
            salt,
            saveVersionAtNimblebit,
            saveData,
            playerSs: config.player.playerSs,
            secretSalt: config.secretSalt,
        };

        /**
         * If the request was made using the auth proxy (because the tinyburg
         * client does not know the secretSalt) then we will use the proxied
         * hash from the authproxy, otherwise compute the validation hash
         * ourselves.
         */
        const serverHash = config.proxy.useProxy
            ? serverResponse.proxiedHash
            : computeDownloadSaveValidationHash(validationHashParameters, passLogger);

        // Confirm the validation hash from the server
        if (serverHash === serverResponse.h) {
            logger.info("Hash verification passed");
            logger.info("Downloaded new save data, starting unpacking...");
            return decompressSave(saveData, passLogger);
        }

        // Could not verify the validation hash from the server
        return logger.fatal(new Error("Hash verification failed when pulling save data"));
    }

    return logger.fatal(new Error("Bad server response"));
};

// Compute validation hash function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DownloadSaveValidationHashParameters = {
    playerId: string;
    salt: number;
    saveVersionAtNimblebit: number;
    saveData: string;
    playerSs: string | undefined;
    secretSalt: string | undefined;
};

// Compute the validation hash and confirm that it matches what Nimblebit's api sent. The
// validation hash is computed as: md5(playerId + salt + id + data + playerSs + secretSalt).
export const computeDownloadSaveValidationHash = (
    { playerId, salt, saveVersionAtNimblebit, saveData, playerSs, secretSalt }: DownloadSaveValidationHashParameters,
    logger: ILogger = debug
): string => {
    const passLogger = logger === debug ? undefined : logger;

    logger.info("Computing validation hash with parameters %o", {
        playerId,
        salt,
        saveVersionAtNimblebit,
        saveData,
        playerSs,
        secretSalt,
    });
    return cryptoMD5(playerId + salt + saveVersionAtNimblebit + saveData + playerSs + secretSalt, passLogger);
};

import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";
import type { IDownloadSave } from "./download-save.js";
import type { DecompressedSave } from "../decompress-save.js";
import type { INimblebitJsonSave } from "../parsing-structs/blocks.js";
import type { INimblebitResponse, IUserMetaDescribed, ISuccessFoundNotFound } from "./nimblebit-response.js";

import { DebugLogger } from "../logger.js";
import { cryptoMD5 } from "../crypto-md5.js";
import { cryptoSalt } from "../crypto-salt.js";
import { decompressSave } from "../decompress-save.js";
import { generateUploadMetadata } from "./upload-save.js";
import { getNetworkRequest, postNetworkRequest, serverEndpoints } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:snapshots";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Pull snapshot function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PullSnapshotParameters = {
    /** The id of the snapshot to pull */
    snapshotId: number;
};

// Push snapshot function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PushSnapshotParameters = {
    /**
     * The save data to upload, can be either a decompressed save or a json
     * save.
     */
    saveData: DecompressedSave | INimblebitJsonSave;

    /** The language your game is in, defaults to "en-us". */
    language?: string;

    /** The platform you are playing on. */
    platform?: "IOS" | "Android";
};

// Nimblebit api retrieve snapshot response type.
export interface IRetrieveSnapshotList extends ISuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    saves: [
        {
            /**
             * Save version that this snapshot was from. Save versions are
             * integer numbers starting at 0 and incrementing by 1 for each
             * following version.
             */
            id: number;

            /** The time that this rebuild/snapshot was created at. */
            created: number;

            /** Meta data for the player at the time this snapshot was taken. */
            meta: IUserMetaDescribed;
        }
    ];
}

// Nimblebit api pull snapshots response type.
export interface IPullSnapshot extends IDownloadSave {
    /** Character? (a.k.a doorman or avatar?) not entirely sure. */
    c: number;
}

// Nimblebit api push snapshot response type.
export interface IPushSnapshot extends INimblebitResponse {
    success?: "Saved" | "NotSaved";
}

// Retrieves a list of your snapshots.
export const retrieveSnapshotList = async (
    config: ITTConfig,
    logger: ILogger = debug
): Promise<IRetrieveSnapshotList> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Pulling snapshot list for player: %s", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The pull snapshot list request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/current_snapshots/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.retrieve_snapshot_list + config.player.playerId + "/" + salt;
    const serverResponse = await getNetworkRequest<IRetrieveSnapshotList>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        logger.info("Success, snapshot list %o", serverResponse.saves);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Pushes a snapshot.
export const pushSnapshot = async (
    config: ITTConfig,
    { saveData, language, platform }: PushSnapshotParameters,
    logger: ILogger = debug
): Promise<IPushSnapshot> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Pulling snapshot list for player: %s", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Generate meta data
    const { metaData, compressedSave } = await generateUploadMetadata({ saveData, language, platform });

    // The push snapshot request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/push_snapshot/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {compressedSave} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + compressedSave + config.player.playerSs;
    const endpoint = serverEndpoints.push_snapshot + config.player.playerId + "/" + salt;
    const serverResponse = await postNetworkRequest<IPushSnapshot>({
        config,
        endpoint,
        hash,
        postData: metaData,
        log: passLogger,
    });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Saved") {
        logger.info("Pushed snapshot successfully: %o", serverResponse);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Pulls one of your snapshots.
export const pullSnapshot = async (
    config: ITTConfig,
    { snapshotId }: PullSnapshotParameters,
    logger: ILogger = debug
): Promise<DecompressedSave> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Pulling snapshot: %s", snapshotId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // The pull snapshot request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/pull_snapshot/tt/{playerId}/{snapshotId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{snapshotId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + snapshotId + "/" + salt + config.player.playerSs;
    const endpoint = serverEndpoints.pull_snapshot + config.player.playerId + "/" + snapshotId + "/" + salt;
    const serverResponse = await getNetworkRequest<IPullSnapshot>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        const saveData = serverResponse.data;
        const saveVersion = serverResponse.id;
        const validationHashParameters: PullSnapshotValidationHashParameters = {
            playerId: config.player.playerId,
            salt,
            saveVersion,
            saveData,
            playerSs: config.player.playerSs,
            secretSalt: config.secretSalt,
        };

        // If the request was made using the auth proxy (because the tinyburg client does not
        // know the secretSalt) then we will use the proxied hash from the authproxy, otherwise
        // compute the validation hash ourselves.
        const serverHash = config.proxy.useProxy
            ? serverResponse.proxiedHash
            : computePullSnapshotValidationHash(validationHashParameters, passLogger);

        // Verify the validation hash from the server
        if (serverHash === serverResponse.h) {
            logger.info("Hash verification passed");
            logger.info("Downloaded snapshot save data, starting unpacking...");
            return decompressSave(saveData);
        }

        // Could not verify the validation hash from the server
        return logger.fatal(new Error("Hash verification failed when pulling snapshot save data"));
    }

    return logger.fatal(new Error("Bad server response"));
};

// Compute validation hash function params.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PullSnapshotValidationHashParameters = {
    playerId: string;
    salt: number;
    saveVersion: number;
    saveData: string;
    playerSs: string | undefined;
    secretSalt: string | undefined;
};

// Compute the validation hash and confirm that it matches what Nimblebit's api sent. The
// validation hash is computed as: md5(playerId + salt + id + data + playerSs + secretSalt).
export const computePullSnapshotValidationHash = (
    { playerId, salt, saveVersion, saveData, playerSs, secretSalt }: PullSnapshotValidationHashParameters,
    logger: ILogger = debug
): string => {
    const passLogger = logger === debug ? undefined : logger;

    logger.info("Computing validation hash with parameters %o", {
        playerId,
        salt,
        saveVersion,
        saveData,
        playerSs,
        secretSalt,
    });
    return cryptoMD5(playerId + salt + saveVersion + saveData + playerSs + secretSalt, passLogger);
};

import type { ITTConfig } from "../tt-config.js";
import type { INimblebitResponse, IUserMetaDescribed, SuccessFoundNotFound } from "./nimblebit-response.js";

import { cryptoMD5 } from "../crypto-md5.js";
import { cryptoSalt } from "../crypto-salt.js";
import { DebugLogger, ILogger } from "../logger.js";
import { parseSaveToJson } from "../save-parser.js";
import { IUploadSave, uploadSave } from "./upload-save.js";
import { checkForNewerSave } from "./check-for-newer-save.js";
import { downloadSave, IDownloadSave } from "./download-save.js";
import { isValidPlayerId } from "../validation/is-valid-player-id.js";
import { DecompressedSave, decompressSave } from "../decompress-save.js";
import { serverEndpoints, postNetworkRequest, getNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace = "tinyburg:endpoints:friends";
const debug = new DebugLogger(loggingNamespace);

// Pull friend anything (meta, tower, or snapshots) function params.
export interface IPullFriendParameters {
    /**
     * Friend cloud id
     */
    friendId: string;
}

// Add friend function parameters
export type AddFriendParameters = {
    forcePush?: boolean;
    forceLoadStructs?: boolean;
} & IPullFriendParameters;

// Nimblebit api pull friend meta data response type.
export interface IFriendMeta<FriendCode extends string>
    extends SuccessFoundNotFound,
        Omit<INimblebitResponse, "success"> {
    meta: {
        [friendCode in FriendCode]: IUserMetaDescribed;
    };
}

// Nimblebit api pull friend tower data response type.
export interface IFriendTower extends IDownloadSave {
    /**
     * Validation hash from the server to make sure that the data arrived correctly, computed
     * as: md5(playerId + player_id + salt + id + data + playerSs + secretSalt). The client should
     * compute the same hash client-side using the downloaded data and confirm that they match.
     */
    h: string;

    /**
     * Which friend this cloud save is for.
     */
    player_id: string;
}

// Nimblebit api pull friend snapshots response type.
export interface IFriendSnapshotList extends SuccessFoundNotFound, Omit<INimblebitResponse, "success"> {
    saves: [
        {
            /**
             * Save version. Save versions are integer numbers starting at 0 and incrementing by 1
             * for each following version.
             */
            id: number;

            /**
             * The time that this rebuild/snapshot was created at.
             */
            created: number;

            /**
             * Meta data for the player at the time this snapshot was taken
             */
            meta: IUserMetaDescribed;
        }
    ];
}

// Adds a friend to your friends list. Your friends list is saved in your save data, so adding
// a friend works by modifying your save data friends list then uploading your save data.
export const addFriend = async (
    config: ITTConfig,
    { friendId, forceLoadStructs = false, forcePush = false }: AddFriendParameters,
    logger: ILogger = debug
): Promise<IUploadSave> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Adding friend: %s...", friendId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Check friend id
    if (!isValidPlayerId(friendId)) {
        return logger.fatal(new Error("Invalid friend code"));
    }

    // Get current save version
    const saveVersion = await checkForNewerSave(config, { saveVersion: -1 }, passLogger);

    // Download save data
    const saveData = await downloadSave(config, passLogger);

    // Modify the friends list
    const parsedSave = await parseSaveToJson(saveData, forceLoadStructs, passLogger);
    parsedSave.friends += `|${friendId}`;

    // Upload the new save data
    return uploadSave(config, { saveData: parsedSave, version: saveVersion, forcePush }, passLogger);
};

// Retrieves meta data of a "friend". While this endpoint is meant to retrieve meta data only your friends, it
// is possible to use this endpoint the get the meta data of any user as there are no server side check if the
// person if actually your friend. Additionally, this endpoint does not require an authenticated tinyburg config
// as it is able to proxy requests through the burn bots.
export const pullFriendMeta = async function <FriendId extends string>(
    config: ITTConfig,
    { friendId }: Omit<IPullFriendParameters, "friendId"> & { friendId: FriendId },
    logger: ILogger = debug
): Promise<IFriendMeta<FriendId>> {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Retrieving metadata for friend: %s...", friendId);

    // Player doesn't have to be authenticated
    const requester = { playerId: config.player.playerId, playerSs: config.player.playerSs };
    if (!config.authenticated) {
        logger.info("Proxying friend meta data request through burn bot %s", config.burnBot.playerId);
        requester.playerId = config.burnBot.playerId;
        requester.playerSs = config.burnBot.playerSs;
    }

    // Check friend id
    if (!isValidPlayerId(friendId)) {
        return logger.fatal(new Error("Invalid friend code"));
    }

    // Construct the post data object
    const postData = { friends: friendId };

    // The pull friend meta data request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/friend/pull_meta/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {friendId} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + requester.playerId + "/" + salt + friendId + requester.playerSs;
    const endpoint = serverEndpoints.friend_pull_meta + requester.playerId + "/" + salt;
    const serverResponse = await postNetworkRequest<IFriendMeta<FriendId>>({
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
    if (serverResponse.success === "Found") {
        logger.info("Success, friend meta-data %o", serverResponse.meta);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Pulls a friends snapshots/rebuilds list. While this endpoint is meant to retrieve meta data only your friends,
// it is possible to use this endpoint the get the meta data of any user as there are no server side check if the
// person if actually your friend. Additionally, this endpoint does not require an authenticated tinyburg config
// as it is able to proxy requests through the burn bots.
export const retrieveFriendSnapshotList = async (
    config: ITTConfig,
    { friendId }: IPullFriendParameters,
    logger: ILogger = debug
): Promise<IFriendSnapshotList> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Pulling snapshots for friend: %s...", friendId);

    // Player doesn't have to be authenticated
    const requester = { playerId: config.player.playerId, playerSs: config.player.playerSs };
    if (!config.authenticated) {
        logger.info("Proxying friend tower request through burn bot %s", config.burnBot.playerId);
        requester.playerId = config.burnBot.playerId;
        requester.playerSs = config.burnBot.playerSs;
    }

    // Check friend id
    if (!isValidPlayerId(friendId)) {
        return logger.fatal(new Error("Invalid friend code"));
    }

    // The pull friend snapshots list request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/current_player_snapshots/tt/{playerId}/{friendId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{friendId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + requester.playerId + "/" + friendId + "/" + salt + requester.playerSs;
    const endpoint = serverEndpoints.retrieve_friends_snapshot_list + requester.playerId + "/" + friendId + "/" + salt;
    const serverResponse = await getNetworkRequest<IFriendSnapshotList>({ config, endpoint, hash, log: passLogger });

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

// Pulls a friends tower. While this endpoint is meant to retrieve meta data only your friends, it
// is possible to use this endpoint the get the meta data of any user as there are no server side check if the
// person if actually your friend. Additionally, this endpoint does not require an authenticated tinyburg config
// as it is able to proxy requests through the burn bots.
export const pullFriendTower = async (
    config: ITTConfig,
    { friendId }: IPullFriendParameters,
    logger: ILogger = debug
): Promise<DecompressedSave> => {
    // Setup logging
    const passLogger = logger !== debug ? logger : undefined;
    logger.info("Pulling tower for friend: %s", friendId);

    // Player doesn't have to be authenticated
    const requester = { playerId: config.player.playerId, playerSs: config.player.playerSs };
    if (!config.authenticated) {
        logger.info("Proxying friend tower request through burn bot %s", config.burnBot.playerId);
        requester.playerId = config.burnBot.playerId;
        requester.playerSs = config.burnBot.playerSs;
    }

    // Check friend id
    if (!isValidPlayerId(friendId)) {
        return logger.fatal(new Error("Invalid friend code"));
    }

    // The pull friend tower request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/friend/pull_game/tt/{playerId}/{friendId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{friendId}/{salt} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + requester.playerId + "/" + friendId + "/" + salt + requester.playerSs;
    const endpoint = serverEndpoints.friend_pull_tower + requester.playerId + "/" + friendId + "/" + salt;
    const serverResponse = await getNetworkRequest<IFriendTower>({ config, endpoint, hash, log: passLogger });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Found") {
        const saveData = serverResponse.data;
        const saveVersion = serverResponse.id;
        const validationHashParameters = {
            playerId: config.player.playerId,
            friendId: serverResponse.player_id,
            salt,
            saveVersion,
            saveData,
            playerSs: config.player.playerSs,
            secretSalt: config.secretSalt,
            log: passLogger,
        };

        // If the request was made using the auth proxy (because the tinyburg client does not
        // know the secretSalt) then we will use the proxied hash from the authproxy, otherwise
        // compute the validation hash ourselves.
        const serverHash = config.proxy.useProxy
            ? serverResponse.proxiedHash
            : computePullFriendTowerValidationHash(validationHashParameters);

        // Verify the validation hash from the server
        if (serverHash === serverResponse.h) {
            logger.info("Hash verification passed");
            logger.info("Pulled friend tower data, starting unpacking...");
            return decompressSave(saveData);
        }

        // Could not verify the validation hash from the server
        return logger.fatal(new Error("Hash verification failed when pulling friend save data"));
    }

    return logger.fatal(new Error("Bad server response"));
};

// Compute validation hash function params.
export interface IPullFriendTowerValidationHashParameters {
    playerId: string;
    friendId: string;
    salt: number;
    saveVersion: number;
    saveData: string;
    playerSs?: string;
    secretSalt?: string;
}

// Compute the validation hash and confirm that it matches what Nimblebit's api sent. The
// validation hash is computed as: md5(playerId + player_id + salt + id + data + playerSs + secretSalt).
export const computePullFriendTowerValidationHash = (
    { playerId, friendId, salt, saveVersion, saveData, playerSs, secretSalt }: IPullFriendTowerValidationHashParameters,
    logger: ILogger = debug
): string => {
    const logTag = { forPlayer: playerId, loggingNamespace };
    const passLogger = logger !== debug ? logger : undefined;

    logger.info(logTag, "Computing validation hash with parameters %o", {
        playerId,
        friendId,
        salt,
        saveVersion,
        saveData,
        playerSs,
        secretSalt,
    });
    return cryptoMD5(playerId + friendId + salt + saveVersion + saveData + playerSs + secretSalt, passLogger);
};

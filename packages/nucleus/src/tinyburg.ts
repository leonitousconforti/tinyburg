import deepExtend from "deep-extend";

// Closures
import { loggerConfigClosure } from "./closures/logger-config.js";
import { createLoggerClosure } from "./closures/logger.js";

// Validation functions
import { isValidPlayerId } from "./validation/player-id.js";

// Library configs
import { defaultConfig, type IConfig } from "./config.js";

// Library methods to expose
import { makeSaveBetterThan, whichSaveIsBetter } from "./compare-saves.js";
import { compressSave } from "./compress-save.js";
import { decompressSave } from "./decompress-save.js";
import { safeModifySave } from "./modify-save.js";
import { saveConfig } from "./save-config.js";
import { appendToBlock, concatJsonToBlock, parseSaveToJson } from "./save-parser.js";

// Endpoint methods to expose (sorted by their filenames)
import { pullBitbookPostCloudFeed } from "./endpoints/bitbook-cloud-feed.js";
import { checkForNewerSave, computeCheckForNewerSaveValidationHash } from "./endpoints/check-for-newer-save.js";
import { pullCloudGiftFeed } from "./endpoints/cloud-gift-feed.js";
import { computeDownloadSaveValidationHash, downloadSave } from "./endpoints/download-save.js";
import {
    addFriend,
    computePullFriendTowerValidationHash,
    pullFriendMeta,
    pullFriendTower,
    retrieveFriendSnapshotList,
} from "./endpoints/friends.js";
import { getGifts, receiveGift } from "./endpoints/gifts.js";
import { newUser } from "./endpoints/new-user.js";
import { playerDetails } from "./endpoints/player-details.js";
import { raffleDetails } from "./endpoints/raffle-details.js";
import { checkEnteredRaffle, enterMultiRaffle, enterRaffle } from "./endpoints/raffle.js";
import { registerEmail } from "./endpoints/register-email.js";
import { sendItem } from "./endpoints/send-item.js";
import {
    computePullSnapshotValidationHash,
    pullSnapshot,
    pushSnapshot,
    retrieveSnapshotList,
} from "./endpoints/snapshots.js";
import { uploadSave } from "./endpoints/upload-save.js";
import { verifyDevice } from "./endpoints/verify-device.js";
import { getVisits, visitFriend } from "./endpoints/visits.js";

// Debug logger
import { DebugLogger, type ILogger } from "./logger.js";
const debug: ILogger = new DebugLogger("tinyburg:core");

/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const fromConfig = (
    partialConfig: Pick<Partial<IConfig>, "burnBot" | "proxy"> &
        Omit<IConfig, "game" | "burnBot" | "proxy"> & { game: string },
    logger: ILogger = debug
) => {
    // Extend the values in the default config with the values in the config provided
    // Needs to be a deep extend, not userConfig = Object.assign(defaultConfig, userConfig);
    const config: IConfig = deepExtend(defaultConfig, partialConfig);

    // Not enough data provided, or data was in the wrong format
    if (!config.player.playerEmail && !config.player.playerSs) {
        throw new Error("Bad arguments provided. Need either the playerEmail or playerSalt to properly initialize");
    }

    // Try to load secrets - no need to exit on failure, just report to the user
    if (!config.secretSalt) {
        config.proxy.useProxy = true;
        logger.warn("Automatically enabled the authproxy settings");
    }

    // Validate the player id
    if (!isValidPlayerId(config.player.playerId)) {
        throw new Error("Invalid playerId, fix the config and restart");
    }

    // Set the authenticated flag
    if (config.player.playerSs) {
        config.authenticated = true;
    }

    logger.info("Tinyburg client started with config: %O", config);
    return {
        config,
        logger,
        saveConfig: (fileName: string) => saveConfig({ config, fileName }),

        // Validation methods
        isValidPlayerId,

        // Parsing and save data methods
        parseSaveToJson: createLoggerClosure(parseSaveToJson),
        concatJsonToBlock: createLoggerClosure(concatJsonToBlock),
        compressSave: createLoggerClosure(compressSave),
        decompressSave: createLoggerClosure(decompressSave),
        appendToBlock,
        safeModifySave,
        whichSaveIsBetter: createLoggerClosure(whichSaveIsBetter),
        makeSaveBetterThan: createLoggerClosure(makeSaveBetterThan),
        // modifySave: createLoggerClosure(modifySave),
        // extract: extractFactory(log),
        // parseDataToType: parseDataToTypeFactory(log),
        // typedDataToBlock: typedDataToBlockFactory(log),

        // Hashing methods
        computeCheckForNewerSaveValidationHash,
        computeDownloadSaveValidationHash,
        computePullFriendTowerValidationHash,
        computePullSnapshotValidationHash,

        // Game endpoints
        raffleDetails: createLoggerClosure(raffleDetails, logger),
        pullCloudGiftFeed: createLoggerClosure(pullCloudGiftFeed, logger),
        pullBitbookPostCloudFeed: createLoggerClosure(pullBitbookPostCloudFeed, logger),
        newUser: loggerConfigClosure(newUser, [config, logger]),
        registerEmail: loggerConfigClosure(registerEmail, [config, logger]),
        verifyDevice: loggerConfigClosure(verifyDevice, [config, logger]),
        playerDetails: loggerConfigClosure(playerDetails, [config, logger]),
        uploadSave: loggerConfigClosure(uploadSave, [config, logger]),
        checkForNewerSave: loggerConfigClosure(checkForNewerSave, [config, logger]),
        downloadSave: loggerConfigClosure(downloadSave, [config, logger]),
        visitPlayer: loggerConfigClosure(visitFriend, [config, logger]),
        getVisits: loggerConfigClosure(getVisits, [config, logger]),
        sendItem: loggerConfigClosure(sendItem, [config, logger]),
        getGifts: loggerConfigClosure(getGifts, [config, logger]),
        receiveGift: loggerConfigClosure(receiveGift, [config, logger]),
        pullFriendMeta: loggerConfigClosure(pullFriendMeta, [config, logger]),
        addFriend: loggerConfigClosure(addFriend, [config, logger]),
        pullFriendTower: loggerConfigClosure(pullFriendTower, [config, logger]),
        retrieveFriendSnapshotList: loggerConfigClosure(retrieveFriendSnapshotList, [config, logger]),
        pullSnapshot: loggerConfigClosure(pullSnapshot, [config, logger]),
        retrieveSnapshotList: loggerConfigClosure(retrieveSnapshotList, [config, logger]),
        pushSnapshot: loggerConfigClosure(pushSnapshot, [config, logger]),
        enterRaffle: loggerConfigClosure(enterRaffle, [config, logger]),
        enterMultiRaffle: loggerConfigClosure(enterMultiRaffle, [config, logger]),
        checkEnteredRaffle: loggerConfigClosure(checkEnteredRaffle, [config, logger]),
    };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const fromPlayerId = (playerId: string, playerEmail?: string, playerSs?: string, log: ILogger = debug) => {
    return fromConfig(
        {
            player: {
                playerId,
                playerSs,
                playerEmail,
            },
        } as unknown as IConfig,
        log === debug ? undefined : log
    );
};

export default {
    fromConfig,
    defaultConfig,
    fromPlayerId,
};

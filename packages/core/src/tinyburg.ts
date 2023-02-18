import deepExtend from "deep-extend";

// Closures
import { createConfigClosure } from "./closures/config.js";
import { createLoggerClosure } from "./closures/logger.js";
import { loggerConfigClosure } from "./closures/logger-config.js";

// Validation functions
import { isValidPlayerId } from "./validation/is-valid-player-id.js";

// Library configs
import { ITTConfig, defaultConfig } from "./tt-config.js";

// Library methods to expose
import { saveConfig } from "./save-config.js";
import { loadSecrets } from "./load-secrets.js";
import { compressSave } from "./compress-save.js";
import { decompressSave } from "./decompress-save.js";
import { concatJsonToBlock, parseSaveToJson, appendToBlock } from "./save-parser.js";
import { safeModifySave } from "./modify-save.js";
import { whichSaveIsBetter, makeSaveBetterThan } from "./compare-saves.js";

// Endpoint methods to expose (sorted by their filenames)
import { pullBitbookPostCloudFeed } from "./endpoints/bitbook-cloud-feed.js";
import { checkForNewerSave, computeCheckForNewerSaveValidationHash } from "./endpoints/check-for-newer-save.js";
import { pullCloudGiftFeed } from "./endpoints/cloud-gift-feed.js";
import { downloadSave, computeDownloadSaveValidationHash } from "./endpoints/download-save.js";
import {
    addFriend,
    pullFriendMeta,
    retrieveFriendSnapshotList,
    pullFriendTower,
    computePullFriendTowerValidationHash,
} from "./endpoints/friends.js";
import { getGifts, receiveGift } from "./endpoints/gifts.js";
import { newUser } from "./endpoints/new-user.js";
import { raffleDetails } from "./endpoints/raffle-details.js";
import { enterRaffle, enterMultiRaffle, checkEnteredRaffle } from "./endpoints/raffle.js";
import { registerEmail } from "./endpoints/register-email.js";
import { sendItem } from "./endpoints/send-item.js";
import {
    retrieveSnapshotList,
    pushSnapshot,
    pullSnapshot,
    computePullSnapshotValidationHash,
} from "./endpoints/snapshots.js";
import { uploadSave } from "./endpoints/upload-save.js";
import { verifyDevice } from "./endpoints/verify-device.js";
import { getVisits, visitFriend } from "./endpoints/visits.js";

// Debug logger
import { DebugLogger, ILogger } from "./logger.js";
const debug: ILogger = new DebugLogger("tinyburg:core");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const fromConfig = (partialConfig: ITTConfig, logger: ILogger = debug) => {
    // Extend the values in the default config with the values in the config provided
    // Needs to be a deep extend, not userConfig = Object.assign(defaultConfig, userConfig);
    const config: ITTConfig = deepExtend(defaultConfig, partialConfig);

    // Not enough data provided, or data was in the wrong format
    if (!config.player.playerEmail && !config.player.playerSs) {
        return logger.fatal(
            new Error("Bad arguments provided. Need either the playerEmail or playerSalt to properly initialize")
        );
    }

    // Try to load secrets - no need to exit on failure, just report to the user
    if (!config.secretSalt) {
        try {
            logger.debug("Attempting to load secrets...");
            loadSecrets(config, "./../tinyburg-keys.json");
        } catch {
            logger.warn("No secret key present in config and could not load secrets from local file!");
            logger.warn(
                "Use either the provided proxy to set the authentication headers or load the secrets later at runtime"
            );

            // Should we be using the proxy for setting the required authentication headers?
            if (!config.proxy.useProxy) {
                config.proxy.useProxy = true;
                logger.warn("Automatically enabled the proxy setting as no secrets have been properly loaded yet");
            }
        }
    }

    // Validate the player id
    if (!isValidPlayerId(config.player.playerId)) {
        return logger.fatal(new Error("Invalid playerId, fix the config and restart"));
    }

    // Set the authenticated flag
    if (config.player.playerSs) {
        config.authenticated = true;
    }
    logger.info("Tinyburg client started with config: %O", config);

    return {
        config,
        logger,
        loadSecrets: createConfigClosure(loadSecrets, config),
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
        } as unknown as ITTConfig,
        log === debug ? undefined : log
    );
};

export default {
    fromConfig,
    defaultConfig,
    fromPlayerId,
};

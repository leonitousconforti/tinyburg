import type { ITTConfig } from "../tt-config.js";
import type { DecompressedSave } from "../decompress-save.js";
import type { INimblebitResponse } from "./nimblebit-response.js";
import type { INimblebitJsonSave } from "../parsing-structs/blocks.js";

import prompts from "prompts";
import { extract } from "../modify-save.js";
import { cryptoSalt } from "../crypto-salt.js";
import { compressSave } from "../compress-save.js";
import { DebugLogger, ILogger } from "../logger.js";
import { parseSaveToJson, concatJsonToBlock } from "../save-parser.js";
import { serverEndpoints, postNetworkRequest } from "../contact-server.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace = "tinyburg:endpoints:upload_save";
const debug = new DebugLogger(loggingNamespace);

// Upload save function params.
export type UploadSaveParameters = {
    forcePush?: boolean;
} & Omit<GenerateUploadMetadataParameters, "requestFloorId">;

// Generate upload metadata function params.
export type GenerateUploadMetadataParameters = {
    /**
     * Save data to upload, either as a decompressed save or a json save.
     */
    saveData: DecompressedSave | INimblebitJsonSave;

    /**
     * Save version to put in the meta data, leave empty if you are
     * generating meta data for a snapshot.
     */
    version?: number;

    /**
     * The language your game is in, defaults to "en-us".
     */
    language?: string;

    /**
     * The platform you are playing on.
     */
    platform?: "IOS" | "Android";

    /**
     * If you are requesting bitizens for a particular floor.
     */
    requestFloorId?: number;
};

// Nimblebit api upload save response type.
export interface IUploadSave extends INimblebitResponse {
    /**
     * The hash of the saved data, should use on client side but are not currently.
     */
    h: string;

    /**
     * Which save version the data was saved as.
     */
    id: string;

    /**
     * Either the request was a success and the data was
     * saved, or it failed and the data was not saved.
     */
    success?: "Saved" | "NotSaved";
}

// Generates the meta data necessary when uploading save data either for pushing to the cloud or pushing a snapshot.
export const generateUploadMetadata = async ({
    saveData,
    version,
    requestFloorId,
    platform = "Android",
    language = "en-us",
}: GenerateUploadMetadataParameters) => {
    // We need two copies of the save data, one as json and one in block form
    let jsonSaveData: INimblebitJsonSave;
    let stringSaveData: DecompressedSave;

    // Format incoming data
    if (typeof saveData === "string") {
        jsonSaveData = await parseSaveToJson(saveData);
        stringSaveData = saveData;
    } else {
        jsonSaveData = saveData as INimblebitJsonSave;
        stringSaveData = await concatJsonToBlock(saveData as INimblebitJsonSave);
    }

    // Compress save, extract the doorman/avatar and reqFID from the save
    const compressedSave = compressSave(stringSaveData);
    const doorman = await extract(stringSaveData, "doorman");

    // Setup metaData
    const metaData = {
        saveData: compressedSave,
        avatar: doorman,
        saveVersion: version,

        level: (jsonSaveData.stories || []).length,
        reqFID: requestFloorId || -1,
        mg: jsonSaveData.maxGold || 0,
        vip: jsonSaveData.vipTrialEnd !== undefined ? 1 : 0,

        p: platform,
        l: language,
    };

    return {
        metaData,
        compressedSave,
    };
};

// Uploads save data to the cloud.
export const uploadSave = async (
    config: ITTConfig,
    { saveData, version, language, platform, forcePush = false }: UploadSaveParameters,
    logger: ILogger = debug
): Promise<IUploadSave> => {
    // Setup logging
    const passLogger = logger != debug ? logger : undefined;
    logger.info("Uploading save data for version: %d", version);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Generate meta data
    const { metaData, compressedSave } = await generateUploadMetadata({ saveData, version, language, platform });

    // Not force pushing and process.stdout is not a terminal, so throw an error
    if (!forcePush && !process.stdout.isTTY) {
        return logger.fatal(new Error(NoForcePushNoTerminal));
    }

    // Otherwise, since process.stdout is a tty we can confirm
    else if (!forcePush && process.stdout.isTTY) {
        const ready = await prompts({
            type: "confirm",
            name: "push save",
            message: readyMessage,
        });

        if (!ready) {
            return logger.fatal(new Error(NotReady));
        }
    }

    // The push save request follows the same authentication process as most other endpoints. The endpoint
    // url will be https://sync.nimblebit.com/sync/push/tt/{playerId}/{salt}/{hash} where
    //
    // playerId is the cloud player id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{playerId}/{salt} + {compressedSave} + {playerSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = "tt/" + config.player.playerId + "/" + salt + compressedSave + config.player.playerSs;
    const endpoint = serverEndpoints.push_save + config.player.playerId + "/" + salt;
    const serverResponse = await postNetworkRequest<IUploadSave>({
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

    // Good response, compute validation hash somehow?
    if (serverResponse.success === "Saved") {
        logger.info("Successfully pushed save: %o", serverResponse);
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

// Message to prompt the user to make sure they are ready to push data
export const readyMessage =
    "Are you sure you are ready to push you save data? (make sure you have to app closed to prevent conflicts)";

// Error messages
export const NotReady = "Not ready to push save data, please try again when you are ready";
export const NoForcePushNoTerminal =
    "Refusing to push save data because the forcePush flag was not set and process.stdout is not a tty so we could not confirm the push";

import type { ILogger } from "./logger.js";
import type { ITTConfig } from "./tt-config.js";
import type { DecompressedSave } from "./decompress-save.js";
import type { IPushSnapshot } from "./endpoints/snapshots.js";
import type { INimblebitJsonSave } from "./parsing-structs/blocks.js";

import fs from "node:fs/promises";
import { DebugLogger } from "./logger.js";
import { compressSave } from "./compress-save.js";
import { parseSaveToJson } from "./save-parser.js";
import { pushSnapshot } from "./endpoints/snapshots.js";
import { downloadSave } from "./endpoints/download-save.js";

// Debug logger
const loggingNamespace: string = "tinyburg:backups";
const debug: ILogger = new DebugLogger(loggingNamespace);

export enum BackupType {
    JSON = "Json",
    COMPRESSED = "compressed",
    DECOMPRESSED = "decompressed",
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BackupParameters = {
    config: ITTConfig;
    logger?: ILogger;
};

export type LocalBackupParameters = {
    location: string;
    type: BackupType;
} & BackupParameters;

export const snapshotBackup = async ({ config, logger = debug }: BackupParameters): Promise<IPushSnapshot> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Starting snapshot backup process for player: %s", config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Download to current tower data and then upload it as a snapshot
    const saveData = await downloadSave(config, passLogger);
    return pushSnapshot(config, { saveData }, passLogger);
};

export const localBackup = async ({
    config,
    type,
    location,
    logger = debug,
}: LocalBackupParameters): Promise<boolean> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info(
        "Starting local backup process with type: %s, to: %s, for player: %s",
        type,
        location,
        config.player.playerId
    );

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Download the current tower data and get it ready to format
    const saveData = await downloadSave(config, passLogger);
    let backupData = "";
    if (type === BackupType.COMPRESSED) {
        backupData = compressSave(saveData, passLogger);
    } else if (type === BackupType.DECOMPRESSED) {
        backupData = saveData.toString();
    } else {
        backupData = JSON.stringify(parseSaveToJson(saveData, false, passLogger));
    }

    // Write the data to the file
    await fs.writeFile(location, backupData);
    return false;
};

export async function applicationLevelBackup<
    T extends BackupType,
    U extends T extends BackupType.COMPRESSED
        ? string
        : T extends BackupType.DECOMPRESSED
        ? DecompressedSave
        : INimblebitJsonSave,
>({ config, type, logger = debug }: BackupParameters & { type: T }): Promise<U> {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Starting application backup process with type: %s for player: %s", type, config.player.playerId);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // Download the current tower data and get it ready to format
    const saveData = await downloadSave(config, passLogger);

    switch (type) {
        case BackupType.COMPRESSED: {
            return compressSave(saveData, passLogger) as U;
        }
        case BackupType.DECOMPRESSED: {
            return saveData.toString() as U;
        }
        case BackupType.JSON: {
            return parseSaveToJson(saveData, false, passLogger) as Promise<U>;
        }
        default: {
            throw new Error("Invalid backup type");
        }
    }
}

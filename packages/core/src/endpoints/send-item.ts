import type { ITTConfig } from "../tt-config.js";
import type { DecompressedSave } from "../decompress-save.js";
import type { INimblebitResponse } from "./nimblebit-response.js";
import type { SyncItemType } from "../parsing-structs/sync-item.js";

import { cryptoSalt } from "../crypto-salt.js";
import { DebugLogger, ILogger } from "../logger.js";
import { isValidPlayerId } from "../validation/is-valid-player-id.js";
import { blocks, INimblebitJsonSave } from "../parsing-structs/blocks.js";
import { serverEndpoints, postNetworkRequest } from "../contact-server.js";
import { concatenationSubRoutine } from "../parsing-structs/parsing-subroutines.js";

// Debug logger (will default to using this if no other logger is supplied).
const loggingNamespace: string = "tinyburg:endpoints:send_item";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Send item function params
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SendItemParameters = {
    /** Type of the item to send. */
    itemType: SyncItemType;

    /** Friend/cloud id of the player to send the item to. */
    sendTo: string;

    /** Item to send. Either as a decompressed save or as a json save. */
    item: DecompressedSave | INimblebitJsonSave;
};

// Nimblebit api send item response type.
export interface ISendItem extends INimblebitResponse {
    success?: "Sent" | "NotSent";
}

// Sends an item to a player. One use case for this endpoint is when visiting players or when
// sending bitizens the players. You can send items to yourself and it will proxy the requests
// through a burn bot.
export const sendItem = async (
    config: ITTConfig,
    { itemType, sendTo, item }: SendItemParameters,
    logger: ILogger = debug
): Promise<ISendItem> => {
    // Setup logging
    const passLogger = logger === debug ? undefined : logger;
    logger.info("Sending item(%s) to %s...", itemType.toString(), sendTo);

    // Player must be authenticated
    if (!config.authenticated) {
        return logger.fatal(new Error("Player not authenticated"));
    }

    // If you want to send something to yourself, we will use the burn bot to 'proxy' the request
    let sendFrom = { id: config.player.playerId, ss: config.player.playerSs };
    if (sendTo === sendFrom.id) {
        sendFrom = { id: config.burnBot.playerId, ss: config.burnBot.playerSs };
    }

    // SendTo should be a valid player id
    if (!isValidPlayerId(sendTo)) {
        return logger.fatal(new Error("Invalid send to address"));
    }

    // Convert the item to a string if needed
    let itemString: DecompressedSave = item as DecompressedSave;
    if (typeof item !== "string") {
        itemString = concatenationSubRoutine(item as INimblebitJsonSave, blocks);
    }

    // The send item request follows the same authentication process as most other endpoints. The
    // endpoint url will be https://sync.nimblebit.com/send_item/tt/{itemType}/{sendFromId}/{sendTo}/{salt}/{hash} where
    //
    // sendFromId is the senders cloud/friend id
    // sendTo is the receivers cloud/friend id
    // salt is a random 32bit signed integer, [-2147483648 to 2147483647]
    // and hash is the md5 hash of tt/{itemType}/{sendFromId}/{sendTo}/{salt} + {itemStr} + {sendFromSs} + {secretSalt}
    const salt = cryptoSalt(passLogger);
    const hash = `tt/${itemType.toString()}/${sendFrom.id}/${sendTo}/${salt}${itemString.toString()}${sendFrom.ss}`;
    const endpoint = serverEndpoints.send_item + itemType.toString() + "/" + sendFrom.id + "/" + sendTo + "/" + salt;
    const serverResponse = await postNetworkRequest<ISendItem>({
        config,
        endpoint,
        hash,
        postData: { itemStr: itemString },
        log: passLogger,
    });

    // Bad response
    if (serverResponse.error) {
        return logger.fatal(new Error(`Authentication error: ${serverResponse.error}`));
    }

    // Good response
    if (serverResponse.success === "Sent") {
        logger.info("Success, item(%s) sent!", itemType.toString());
        return serverResponse;
    }

    return logger.fatal(new Error("Bad server response"));
};

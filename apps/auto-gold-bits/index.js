/**
 * Implements an "auto gold-bit farm" where when you send a bit to this player,
 * it will send it back to you as a gold bit (bit with max stats and for the
 * floor that you are currently requesting bits for from your friends). Similar
 * to the DYNO bot
 */

import tinyburg from "@tinyburg/core";
import { bitizenBlocks } from "@tinyburg/core/parsing-structs/bitizen";
import { SyncItemType } from "@tinyburg/core/parsing-structs/sync-item";
import { parseDataToType, typedDataToBlock } from "@tinyburg/core/modify-save";

// Create the bot
const bitFarm = tinyburg.fromPlayerId(
    process.env["BIT_FARM_PLAYER_ID"] || "",
    process.env["BIT_FARM_PLAYER_EMAIL"],
    process.env["BIT_FARM_PLAYER_SS"]
);
bitFarm.config.proxy.useProxy = true;
bitFarm.config.proxy.api_key = process.env["TINYBURG_AUTHPROXY_API_KEY"];

async function processGifts() {
    // Get all the bitizens sent to this account
    const gifts = await bitFarm.getGifts();
    bitFarm.logger.info("Processing %s gift(s)", gifts.total);

    // Get all the gifts that are of type PLAY, presumably meaning that they
    // were sent from another player, this will be the bitizens sent to this
    // account.
    const bitsReceived = gifts.gifts.filter((gift) => gift.gift_type == SyncItemType.Play);

    // For every bitizen gift
    for (let bitizenGift of bitsReceived) {
        bitFarm.logger.info("gift: %s", bitizenGift);

        // Remove the bit heading so we can parse the rest. I guess
        // technically this step is not necessary as the save-parser is
        // certainly able to handle it, but I like to acknowledge that it is
        // here and remove it anyways as a reminder to put it back before we
        // send the bit.
        const bitizenString = bitizenGift.gift_str.replaceAll(/^bit:/gim, "");

        // Parse the bitizen to the correct type for easier manipulation,
        // YAY for typings and generic functions!
        const bitizen = parseDataToType(bitizenString, bitizenBlocks);

        // Modify the bitizen to be max skills
        bitizen.attributes.skillFood = 9;
        bitizen.attributes.skillRetail = 9;
        bitizen.attributes.skillService = 9;
        bitizen.attributes.skillCreative = 9;
        bitizen.attributes.skillRecreation = 9;

        // We also try to pull the meta data for this 'friend' (we can pull
        // friend meta data without actually have to add them as a friend). We
        // want the friend meta data because it will tell us if they are
        // requesting a particular floor so we can set the dream job index
        // automatically
        const friend = await bitFarm.pullFriendMeta({ friendId: bitizenGift.gift_from });
        const fridaMeta = friend.meta[bitizenGift.gift_from];
        if (fridaMeta && fridaMeta.reqFID !== -1) {
            bitizen.dreamJobIndex = fridaMeta.reqFID;
        }

        // There are a number of transformations we need to perform before we
        // can return the bitizen. First we need to change the bitizen back into
        // blockStr data from json data
        const bitizenStringModified = typedDataToBlock(bitizen, bitizenBlocks);

        // Now we need to append the prefix "bit:" to the block str data of the
        // bit. We use a helper method here so we preserve the DecompressedSave
        // type that was returned from the previous function
        const itemString = bitFarm.appendToBlock("bit:", bitizenStringModified);

        // Now we are ready to return the bitizen to the player that sent it
        await bitFarm.sendItem({ item: itemString, itemType: SyncItemType.Play, sendTo: bitizenGift.gift_from });

        // If it was a success, then we can mark the item as received
        await bitFarm.receiveGift({ gift: bitizenGift });
    }
}

// Schedule the process gifts function
let processGiftsIntervalMinutes = Number.parseInt(process.env["PROCESS_GIFTS_INTERVAL_MINUTES"] || "5");
setInterval(processGifts, 1000 * 60 * processGiftsIntervalMinutes);
bitFarm.logger.info("Auto gold bit farm is running! Will process bits every %d mins", processGiftsIntervalMinutes);

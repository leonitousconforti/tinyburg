/* eslint-disable @typescript-eslint/typedef */

import tinyburg from "@tinyburg/nucleus";
import { parseDataToType, typedDataToBlock } from "@tinyburg/nucleus/modify-save";
import { SyncItemType } from "@tinyburg/nucleus/parsing-structs/sync-item";
import { bitizenBlocks } from "@tinyburg/nucleus/parsing-structs/v4.0.0/bitizen";

const bitFarm = tinyburg.fromConfig({
    proxy: {
        useProxy: true,
        api_key: "a51b1e31-bad6-4d33-b50b-0aeaf8553b79",
        address: "https://authproxy.tinyburg.app",
    },
    authenticated: true,
    game: "TinyTower",
    nimblebitHost: "https://sync.nimblebit.com",
    player: {
        playerId: "HQDW4",
        playerSs: "e14cf7c5-0acb-4d02-acc7-2a91ee620b8d",
    },
});

async function processGifts() {
    const gifts = await bitFarm.getGifts();
    console.log(`Processing ${gifts.total} gift(s)`);

    // Get all the gifts that are of type PLAY, presumably meaning that they
    // were sent from another player, this will be the bitizens sent to this
    // account.
    const bitsReceived = gifts.gifts.filter((gift) => gift.gift_type === SyncItemType.Play);

    // For every bitizen gift
    for (let bitizenGift of bitsReceived) {
        console.log(`Gift: `, bitizenGift);

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
        const friendMeta = friend.meta[bitizenGift.gift_from];
        if (friendMeta && friendMeta.reqFID !== -1) {
            bitizen.dreamJobIndex = friendMeta.reqFID;
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
await processGifts();
console.log("Auto gold bit farm is running");

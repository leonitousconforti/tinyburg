import type { ILogger } from "../logger.js";

import got from "got";
import { DebugLogger } from "../logger.js";
import { defaultHeaders } from "../contact-server.js";
import { jsDateToTicks } from "../parsing-structs/time-helpers.js";

// Debug logger, will default to using this if no other logger is supplied.
const loggingNamespace = "tinyburg:endpoints:cloud_gift_feed";
const debug = new DebugLogger(loggingNamespace);

// Nimblebit api cloud gift response type. (I am yet to get any data from this endpoint,
// every time it is empty. Probably because Nimblebit isn't giving out a lot of free
// gifts to everyone. In the meantime, this type will have to do).
// TODO: figure out type information
export interface ICloudGift {
    [key: string]: unknown;
}

// Nimblebit api cloud gift feed url.
export const cloudGiftFeedEndpoint = "https://s3.amazonaws.com/NBStatic/TTUnityCloudGift.json";

// Pulls from the cloud gift feed.
export const pullCloudGiftFeed = async (logger: ILogger = debug): Promise<ICloudGift> => {
    // Grab the current time and convert to c# ticks
    logger.debug("Starting pull cloud gift feed...");
    const now = new Date();
    const ticks = jsDateToTicks(now);
    logger.debug("Current time is %s, ticks=%d", now.toUTCString(), ticks);

    // Craft the url and set the search params
    const url = new URL(cloudGiftFeedEndpoint);
    url.searchParams.set("t", ticks.toString());
    logger.info("Sending request for cloud gift feed to %s", url.toString());
    return got.get(url, { headers: defaultHeaders }).json<ICloudGift>();
};

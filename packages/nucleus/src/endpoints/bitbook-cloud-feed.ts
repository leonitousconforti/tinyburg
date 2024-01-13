import type { ILogger } from "../logger.js";

import got from "got";
import { DebugLogger } from "../logger.js";
import { defaultHeaders } from "../contact-server.js";
import { jsDateToTicks } from "../parsing-structs/time-helpers.js";

// Debug logger, will default to using this if no other logger is supplied.
const loggingNamespace: string = "tinyburg:endpoints:bitbook_cloud_feed";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api cloud bitbook post response type.
export interface ICloudBitbookPost {
    tid: number;
    text: string;
    mediatype: number;
    mediapath: string;
    "mediapath-ios": string;
    "mediapath-android": string;
}

// Nimblebit api cloud bitbook post url.
export const bitbookPostCloudFeedEndpoint: string = "https://s3.amazonaws.com/NBStatic/TTUnityCloudBBPost.json";

// Pulls from the cloud gift feed.
export const pullBitbookPostCloudFeed = async (logger: ILogger = debug): Promise<ICloudBitbookPost> => {
    // Grab the current time and convert to C# ticks
    logger.debug("Starting pull bitbook post cloud feed...");
    const now = new Date();
    const ticks = jsDateToTicks(now);
    logger.debug("Current time is %s, ticks=%d", now.toUTCString(), ticks);

    // Craft the url and set the search params
    const url = new URL(bitbookPostCloudFeedEndpoint);
    url.searchParams.set("t", ticks.toString());
    logger.info("Sending request for bitbook cloud posts to %s", url.toString());
    return got.get(url, { headers: defaultHeaders }).json<ICloudBitbookPost>();
};

import type { ILogger } from "./logger.js";
import type { Headers, Method } from "got";
import type { IConfig } from "./config.js";

import got from "got";
import { DebugLogger } from "./logger.js";
import { cryptoMD5 } from "./crypto-md5.js";

// Debug logger
const loggingNamespace: string = "tinyburg:contact_server";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Tiny tower server endpoints
// eslint-disable-next-line @rushstack/typedef-var
export const serverEndpoints = {
    newUser: "/register/tt/",
    playerDetails: "/player_details/tt/",
    verifyDevice: "/verify_device/tt/",
    registerEmail: "/register_email/tt/",
    pullSave: "/sync/pull/tt/",
    pushSave: "/sync/push/tt/",
    checkForNewerSave: "/sync/current_version/tt/",
    enterRaffle: "/raffle/enter/tt/",
    enterMultiRaffle: "/raffle/enter_multi/tt/",
    enteredCurrent: "/raffle/entered_current/tt/",
    sendItem: "/send_item/tt/",
    getGifts: "/get_gifts/tt/",
    receiveGift: "/receive_item/tt/",
    friendPullMeta: "/friend/pull_meta/tt/",
    friendPullTower: "/friend/pull_game/tt/",
    getVisits: "/get_visits/tt/",
    pushSnapshot: "/sync/push_snapshot/tt/",
    pullSnapshot: "/sync/pull_snapshot/tt/",
    retrieveSnapshotList: "/sync/current_snapshots/tt",
    retrieveFriendsSnapshotList: "/sync/current_player_snapshots/tt/",
} as const;

// Default headers to include in every request
export const defaultHeaders: Headers = {
    "X-Unity-Version": "2020.3.0f1",
    "User-Agent": "UnityPlayer/2020.3.0f1 (UnityWebRequest/1.0, libcurl/7.52.0-DEV)",
};

// Network request function params
interface INetworkRequestParameters {
    hash: string;
    method: Method;
    config: IConfig;
    endpoint: string;
    log: ILogger | undefined;
    postData?: Record<string, unknown>;
}

// Basic network request
const networkRequest = async <T>({
    config,
    endpoint,
    hash,
    method,
    postData,
    log = debug,
}: INetworkRequestParameters): Promise<T> => {
    const request = { headers: defaultHeaders, method, form: method === "POST" ? postData : undefined };

    // Check proxy settings and make the appropriate request
    let serverResponse;
    if (config.proxy.useProxy) {
        // Create proxy endpoint
        const proxyUrl = new URL(config.proxy.address);
        proxyUrl.searchParams.set("hash", hash);
        proxyUrl.searchParams.set("endpoint", endpoint);

        // Add the api key to the request headers if it exists
        if (config.proxy.api_key) {
            // eslint-disable-next-line dot-notation
            request.headers["Authorization"] = `Bearer ${config.proxy.api_key}`;
        }

        // Make the request to the authproxy's servers
        log.debug("Starting new http request to %s", proxyUrl.href);
        serverResponse = await got(proxyUrl, request).json<T>();
    } else {
        // Update the hash
        hash = cryptoMD5(hash + config.secretSalt);

        // Append hash to endpoint
        endpoint += "/" + hash;

        // Make request to nimblebit's server
        log.debug("Starting new http request to: %s%s", config.nimblebitHost, endpoint);
        const nimblebitUrl = new URL(endpoint, config.nimblebitHost);
        serverResponse = await got(nimblebitUrl, request).json<T>();
    }

    // Log the response
    log.debug("Http request finished, data: %s", serverResponse);
    return serverResponse;
};

// Get network request function params
export interface IGetNetworkRequestParameters {
    config: IConfig;
    endpoint: string;
    hash: string;
    log: ILogger | undefined;
}

// Post network request function params
export interface IPostNetworkRequestParameters extends IGetNetworkRequestParameters {
    postData: Record<string, unknown>;
}

export const postNetworkRequest = async <T>({
    config,
    endpoint,
    hash,
    postData,
    log,
}: IPostNetworkRequestParameters): Promise<T> =>
    networkRequest({ config, endpoint, hash, postData, method: "POST", log });

export const getNetworkRequest = async <T>({ config, endpoint, hash, log }: IGetNetworkRequestParameters): Promise<T> =>
    networkRequest({ config, endpoint, hash, method: "GET", log });

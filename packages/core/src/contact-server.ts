import got, { Headers, Method } from "got";
import { cryptoMD5 } from "./crypto-md5.js";
import type { ITTConfig } from "./tt-config.js";
import { DebugLogger, ILogger } from "./logger.js";

// Debug logger
const loggingNamespace: string = "tinyburg:contact_server";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Tiny tower server endpoints
/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line @rushstack/typedef-var
export const serverEndpoints = {
    new_user: "/register/tt/",
    verify_device: "/verify_device/tt/",
    register_email: "/register_email/tt/",
    pull_save: "/sync/pull/tt/",
    push_save: "/sync/push/tt/",
    check_for_newer_save: "/sync/current_version/tt/",
    enter_raffle: "/raffle/enter/tt/",
    enter_multi_raffle: "/raffle/enter_multi/tt/",
    entered_current: "/raffle/entered_current/tt/",
    send_item: "/send_item/tt/",
    get_gifts: "/get_gifts/tt/",
    receive_gift: "/receive_item/tt/",
    friend_pull_meta: "/friend/pull_meta/tt/",
    friend_pull_tower: "/friend/pull_game/tt/",
    get_visits: "/get_visits/tt/",
    push_snapshot: "/sync/push_snapshot/tt/",
    pull_snapshot: "/sync/pull_snapshot/tt/",
    retrieve_snapshot_list: "/sync/current_snapshots/tt",
    retrieve_friends_snapshot_list: "/sync/current_player_snapshots/tt/",
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

// Default headers to include in every request
export const defaultHeaders: Headers = {
    "X-Unity-Version": "2020.3.0f1",
    "User-Agent": "UnityPlayer/2020.3.0f1 (UnityWebRequest/1.0, libcurl/7.52.0-DEV)",
};

// Network request function params
interface INetworkRequestParameters {
    hash: string;
    method: Method;
    config: ITTConfig;
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
    config: ITTConfig;
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

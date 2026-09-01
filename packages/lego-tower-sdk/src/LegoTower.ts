/**
 * LEGO Tower SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `lt` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */

import type * as Schema from "effect/Schema";

import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Redacted from "effect/Redacted";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import type { NimblebitConfig } from "@tinyburg/nimblebit-sdk";

import { NimblebitAuth, NimblebitError } from "@tinyburg/nimblebit-sdk";

import * as Endpoints from "./Endpoints.ts";

/**
 * Requests a new player ("burnbot") from the Nimblebit servers. VERIFIED.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_newPlayer = Effect.gen(function* () {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceNewPlayer",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt1 = yield* nimblebitAuth.salt;
    const salt2 = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`lt/${salt1}/${salt2}`);
    const response = yield* endpoint({ params: { salt1, salt2, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "DeviceNewPlayer",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Retrieves player details. VERIFIED.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_playerDetails = Effect.fn("device_playerDetails")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DevicePlayerDetails",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`lt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "DevicePlayerDetails",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }
    return response.player;
});

/**
 * Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
 * parse separately). Success envelope DERIVED from Tiny Tower.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pullSave = Effect.fn("sync_pullSave")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`lt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Lists items (parts/gifts) waiting for the player. VERIFIED
 * (`/get_items/pt/...` -> `{ success:"Found", gifts:[...] }`, no total).
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_getItems = Effect.fn("social_getItems")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialGetItems",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`lt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialGetItems",
            module: "SocialGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Pocket Trains SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * Each preimage matches the one the game was seen signing, except `get_items`,
 * whose game request was not observed.
 *
 * Each method says whether the game was OBSERVED making its request and whether
 * the method was REPLAYED against sync.nimblebit.com (2026-11-09). Save bytes
 * are returned raw (base64-decoded); inflating (pako) and parsing into a save
 * schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */

import type * as Schema from "effect/Schema";

import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import { HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as Redacted from "effect/Redacted";

import type { NimblebitConfig } from "@tinyburg/nimblebit-sdk";

import { NimblebitAuth, NimblebitError } from "@tinyburg/nimblebit-sdk";

import * as Endpoints from "./Endpoints.ts";

/**
 * Requests a new player ("burnbot") from the Nimblebit servers. OBSERVED and
 * REPLAYED.
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
    const hash = yield* nimblebitAuth.sign(`pt/${salt1}/${salt2}`);
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
 * Retrieves player details. OBSERVED and REPLAYED.
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
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * parse separately). OBSERVED and REPLAYED, but only for a player without a
 * save; the Found envelope is from the game's DTO NBSyncGameSaveResponse.
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
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * Checks the id of the player's latest cloud save. OBSERVED, but only for a
 * player without a save (`{ error: "NoSave" }`); the Found envelope is from the
 * game's DTO NBSyncCurrentCheckResponse. Not replayed.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_checkForNewerSave = Effect.fn("sync_checkForNewerSave")(function* ({
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
        endpoint: "SyncCheckForNewerSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Lists items (parts/gifts) waiting for the player. REPLAYED
 * (`/get_items/pt/...` -> `{ success:"Found", gifts:[...] }`, no total); the
 * game's own request was not observed. A later call for the same player returned
 * no gifts, so this may consume them (unverified).
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
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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

/**
 * Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate + parse
 * separately). OBSERVED, but only with the player's own id as the friend and no
 * save (`{ error: "SaveNotFound" }`); the Found envelope is from the game's DTO
 * NBSyncFriendGameSaveResponse. Not replayed.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_pullFriendGame = Effect.fn("social_pullFriendGame")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialPullFriendGame",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendGame",
            module: "SocialGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Pulls metadata about a friend. OBSERVED, but only with the player's own id as
 * the friend (`{ success: "Found", meta: {} }`). The game posts `friends` as a
 * form field and passes a list; this sends one id as JSON, and whether the
 * server accepts JSON is unverified. Not replayed.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_pullFriendMeta = Effect.fn("social_pullFriendMeta")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialPullFriendMeta",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`pt/${playerId}/${salt}${friendId}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash }, payload: { friends: friendId } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendMeta",
            module: "SocialGroup",
            cause: response.error,
        });
    }
    return response;
});

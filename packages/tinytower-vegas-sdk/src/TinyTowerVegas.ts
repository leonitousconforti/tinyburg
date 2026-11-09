/**
 * Tiny Tower Vegas SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random `salt` in the path. The SDK
 * draws uint32 salts, which the server accepts; the game sends signed int32
 * ones. Each preimage below is the one the game was OBSERVED signing (Play
 * build 1.5.2, 2026-11-09), except `sync_pullSave`'s, which the game did not
 * send.
 *
 * Functions marked REPLAYED succeeded against sync.nimblebit.com (2026-11-09).
 * Save bytes are returned raw (base64-decoded); inflating (pako) and parsing
 * into a save schema is left to the caller.
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
    const hash = yield* nimblebitAuth.sign(`vegas/${salt1}/${salt2}`);
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
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * parse separately). Replayed for a player with no save, the server answered
 * `{ error: "SaveNotFound" }`, so it accepts this path and preimage. The
 * `Found` envelope is DERIVED from Tiny Tower.
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
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * Lists items (gifts) waiting for the player. OBSERVED and REPLAYED
 * (`/get_items/vegas/...` -> `{ success: "Found", event_rewards: [...], gifts:
 * [...] }`).
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
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * Lists the visits made to the player's tower. OBSERVED preimage
 * `vegas/<playerId>/<salt><playerAuthKey>`; not replayed.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_getVisits = Effect.fn("social_getVisits")(function* ({
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
        endpoint: "SocialGetVisits",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialGetVisits",
            module: "SocialGroup",
            cause: response.error,
        });
    }
    return response;
});

/**
 * Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate +
 * parse separately). OBSERVED preimage
 * `vegas/<playerId>/<friendId>/<salt><playerAuthKey>`, captured with the
 * player's own id as the friend, so the order of the two ids is DERIVED from
 * Tiny Tower. Only the `{ error: "SaveNotFound" }` reply was seen; not
 * replayed.
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
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
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
 * Pulls metadata about a friend. OBSERVED preimage
 * `vegas/<playerId>/<salt><friendId><playerAuthKey>`, captured with the
 * player's own id as the friend; not replayed. The game posts `friends` as a
 * form field and takes a list of them; this sends one id as JSON, which the
 * server is not known to accept.
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
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${salt}${friendId}${Redacted.value(playerAuthKey)}`);
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

/**
 * Lists a friend's cloud snapshots. OBSERVED preimage
 * `vegas/<playerId>/<friendId>/<salt><playerAuthKey>`; with the player's own
 * id as the friend the server answered `{ error: "Invalid Request" }`. The
 * order of the two ids and the `Found` envelope are DERIVED from Tiny Tower;
 * not replayed.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_retrieveFriendsSnapshotList = Effect.fn("social_retrieveFriendsSnapshotList")(function* ({
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
        endpoint: "SocialRetrieveFriendsSnapshotList",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`vegas/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialRetrieveFriendsSnapshotList",
            module: "SocialGroup",
            cause: response.error,
        });
    }
    return response;
});

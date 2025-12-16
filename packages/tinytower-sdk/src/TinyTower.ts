/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */

import type * as Schema from "effect/Schema";
import type * as NimblebitConfig from "./NimblebitConfig.ts";

import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Redacted from "effect/Redacted";
import * as Pako from "pako";

import { Api } from "./internal/nimblebitEndpoints.ts";
import { NimblebitAuth } from "./NimblebitAuth.ts";
import { NimblebitError } from "./NimblebitError.ts";

/**
 * Requests a new player from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_newPlayer = Effect.gen(function* () {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceNewPlayer",
        httpClient,
    });

    const salt1 = yield* nimblebitAuth.salt;
    const salt2 = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${salt1}/${salt2}`);
    const response = yield* endpoint({ path: { salt1, salt2, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "DeviceNewPlayer",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }

    return response;
});

/**
 * Retrieves player details from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_playerDetails = Effect.fn("device_playerDetails")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DevicePlayerDetails",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "DevicePlayerDetails",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }

    return response.player;
});

/**
 * Verifies a cloud sync device after registration with the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_verifyDevice = Effect.fn("device_verifyDevice")(function* ({
    verificationCode,
}: {
    verificationCode: string;
}) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceVerifyDevice",
        httpClient,
    });

    const playerId = yield* Effect.map(nimblebitAuth.burnbot, ({ playerId }) => playerId);
    const response = yield* endpoint({ path: { playerId, verificationCode } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "DeviceVerifyDevice",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }

    return response;
});

/**
 * Registers an email address to a players Nimblebit cloud sync account.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_registerEmail = Effect.fn("device_registerEmail")(function* ({
    playerEmail,
}: Schema.Schema.Type<NimblebitConfig.UnauthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceRegisterEmail",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const burnbot = yield* nimblebitAuth.burnbot;

    const hash = yield* nimblebitAuth.sign(
        `tt/${burnbot.playerId}/${salt}${Redacted.value(playerEmail)}${Redacted.value(burnbot.playerAuthKey)}`
    );

    const response = yield* endpoint({
        payload: { email: playerEmail, promote: 1 },
        path: { playerId: burnbot.playerId, salt, hash },
    });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "DeviceRegisterEmail",
            module: "DeviceManagementGroup",
            cause: response.error,
        });
    }

    return response.success;
});

/**
 * Pulls the latest save data from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pullSave = Effect.fn("sync_pullSave")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSave",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: "Player has no save data",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum) {
        return yield* new NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: "Checksum mismatch",
        });
    }

    return {
        saveId: response.saveId,
        data: Pako.inflate(response.data, { to: "string" }),
    };
});

/**
 * Pushes save data to the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pushSave = {};

/**
 * Checks what the latest save version is on the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_checkForNewerSave = Effect.fn("sync_checkForNewerSave")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncCheckForNewerSave",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: "Player has no save data",
        });
    }

    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + String(response.saveId) + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum) {
        return yield* new NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: "Checksum mismatch",
        });
    }

    return response.saveId;
});

/**
 * Pulls a specific snapshot from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pullSnapshot = Effect.fn("sync_pullSnapshot")(function* ({
    playerAuthKey,
    playerId,
    snapshotId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & { snapshotId: number }) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSnapshot",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${snapshotId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash, snapshotId } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: "Snapshot not found",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum) {
        return yield* new NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: "Checksum mismatch",
        });
    }

    return {
        saveId: response.saveId,
        data: Pako.inflate(response.data, { to: "string" }),
    };
});

/**
 * Pushes a snapshot to the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pushSnapshot = {};

/**
 * Retrieves a list of snapshots from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_retrieveSnapshotList = Effect.fn("sync_retrieveSnapshotList")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncRetrieveSnapshotList",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SyncRetrieveSnapshotList",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SyncRetrieveSnapshotList",
            module: "SyncManagementGroup",
            cause: "Player has no snapshots",
        });
    }

    return response.saves;
});

/**
 * Enters the player into the hourly raffle.
 *
 * @since 1.0.0
 * @category SDK
 */
export const raffle_enterRaffle = Effect.fn("raffle_enterRaffle")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnter",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "RaffleEnter",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotEntered") {
        return yield* new NimblebitError({
            method: "RaffleEnter",
            module: "RaffleGroup",
            cause: "Player could not be entered into the raffle",
        });
    }

    return yield* Effect.void;
});

/**
 * Enters the player into the next 8 hourly raffles.
 *
 * @since 1.0.0
 * @category SDK
 */
export const raffle_enterMultiRaffle = Effect.fn("raffle_enterMultiRaffle")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnterMulti",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "RaffleEnterMulti",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotEntered") {
        return yield* new NimblebitError({
            method: "RaffleEnterMulti",
            module: "RaffleGroup",
            cause: "Player could not be entered into the raffles",
        });
    }

    return yield* Effect.void;
});

/**
 * Checks if the player has entered the current hourly raffle.
 *
 * @since 1.0.0
 * @category SDK
 */
export const raffle_checkEnteredCurrent = Effect.fn("raffle_checkEnteredCurrent")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleCheckEnteredCurrent",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "RaffleCheckEnteredCurrent",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    return response.success === "Entered";
});

/**
 * Sends a sync item to a friend.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_sendItem = {};

/**
 * Retrieves gifts sent to the player.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_getGifts = {};

/**
 * Marks a gift sent to the player as received.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_receiveGift = {};

/**
 * Pulls metadata about a friend's tower from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_pullFriendMeta = {};

/**
 * Pulls a friend's tower save data from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_pullFriendTower = Effect.fn("social_pullFriendTower")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialPullFriendTower",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SocialPullFriendTower",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SocialPullFriendTower",
            module: "SocialGroup",
            cause: "Friend tower not found",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + friendId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum) {
        return yield* new NimblebitError({
            method: "SocialPullFriendTower",
            module: "SocialGroup",
            cause: "Checksum mismatch",
        });
    }

    return {
        saveId: response.saveId,
        data: Pako.inflate(response.data, { to: "string" }),
    };
});

/**
 * Retrieves a list of a friend's snapshots from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_retrieveFriendsSnapshotList = Effect.fn("social_retrieveFriendsSnapshotList")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialRetrieveFriendsSnapshotList",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SocialRetrieveFriendsSnapshotList",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SocialRetrieveFriendsSnapshotList",
            module: "SocialGroup",
            cause: "Friend has no snapshots",
        });
    }

    return response.saves;
});

/**
 * Retrieves visits made to the player's tower.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_getVisits = Effect.fn("social_getVisits")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialGetVisits",
        httpClient,
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError({
            method: "SocialGetVisits",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError({
            method: "SocialGetVisits",
            module: "SocialGroup",
            cause: "Player visits not found",
        });
    }

    return {
        total: response.total,
        visits: response.gifts,
    };
});

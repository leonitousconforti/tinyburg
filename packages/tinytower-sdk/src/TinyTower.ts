/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */

import type * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Function from "effect/Function";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Pako from "pako";

import { NimblebitAuth, NimblebitError, NimblebitSchema } from "@tinyburg/nimblebit-sdk";
import { Api } from "./Endpoints.ts";
import { SyncItemType } from "./SyncItemType.ts";

import * as BitbookPost from "./BitbookPosts.ts";
import * as Bitizen from "./Bitizens.ts";
import * as Floor from "./Floors.ts";
import * as Mission from "./Missions.ts";

/**
 * How to decode a SaveData from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = Schema.transform(
    Schema.String,
    NimblebitSchema.parseNimblebitObject(
        Schema.Struct({
            coins: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pc")),
            bux: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pb")),
            Ppig: Schema.String.pipe(Schema.optional, Schema.fromKey("Ppig")),
            Pplim: Schema.String.pipe(Schema.optional, Schema.fromKey("Pplim")),
            maxGold: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pmg")),
            gold: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pg")),
            tip: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Ptip")),
            needUpgrade: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pnu")),
            ver: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pver")),
            roof: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pr")),
            lift: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pe")),
            lobby: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pl")),
            buxBought: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pbxb")),
            installTime: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("PiT")),
            lastSaleTick: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("PlST")),
            lobbyName: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pln")),
            raffleID: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Prf")),
            vipTrialEnd: Schema.BigInt.pipe(Schema.propertySignature, Schema.fromKey("Pvte")),
            costumes: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pcos")),
            pets: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Ppets")),
            missionHist: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Pmhst")),
            bbHist: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pbhst")),
            roofs: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Prfs")),
            lifts: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plfs")),
            lobbies: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plbs")),
            bannedFriends: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Pbf")),
            liftSpeed: Schema.NumberFromString.pipe(Schema.optional, Schema.fromKey("Pls")),
            totalPoints: Schema.BigInt.pipe(Schema.propertySignature, Schema.fromKey("Ptp")),
            lrc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plrc")),
            lfc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plfc")),
            cfd: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pcfd")),
            lbc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plbc")),
            lbbcp: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plbbcp")),
            lcmiss: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plcmiss")),
            lcg: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plcg")),
            sfx: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Psfx")),
            mus: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pmus")),
            notes: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pnts")),
            autoLiftDisable: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pald")),
            videos: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pvds")),
            vidCheck: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pvdc")),
            bbnotes: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pbbn")),
            hidechat: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Phchat")),
            tmi: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Ptmi")),
            PVF: Schema.String.pipe(Schema.optional, Schema.fromKey("PVF")),
            PHP: Schema.String.pipe(Schema.optional, Schema.fromKey("PHP")),
            mission: Mission.Mission.pipe(Schema.optional, Schema.fromKey("Pmiss")),
            doorman: Bitizen.Bitizen.pipe(Schema.propertySignature, Schema.fromKey("Pdrmn")),
            playerID: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Ppid")),
            playerRegistered: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Preg")),
            bzns: Schema.compose(Schema.split("|"), Schema.Array(Bitizen.Bitizen)).pipe(
                Schema.propertySignature,
                Schema.fromKey("Pbits")
            ),
            stories: Schema.compose(Schema.split("|"), Schema.Array(Floor.Floor)).pipe(
                Schema.propertySignature,
                Schema.fromKey("Pstories")
            ),
            friends: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pfrns")),
            bbPosts: Schema.compose(Schema.split("|"), Schema.Array(BitbookPost.BitbookPost)).pipe(
                Schema.propertySignature,
                Schema.fromKey("PBB")
            ),
            bbpost: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plp")),
        })
    ),
    {
        encode: (input) => `[_save]${input}[_save]`,
        decode: (input) => (input.startsWith('"') ? input.slice(8, -8) : input.slice(7, -7)),
    }
);

/**
 * Requests a new player from the Nimblebit servers.
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

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceNewPlayer",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt1 = yield* nimblebitAuth.salt;
    const salt2 = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${salt1}/${salt2}`);
    const response = yield* endpoint({ path: { salt1, salt2, hash } });

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
 * Retrieves player details from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const device_playerDetails = Effect.fn("device_playerDetails")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DevicePlayerDetails",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceVerifyDevice",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const playerId = yield* Effect.map(nimblebitAuth.burnbot, ({ playerId }) => playerId);
    const response = yield* endpoint({ path: { playerId, verificationCode } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceRegisterEmail",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
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
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSave",
            module: "SyncManagementGroup",
            cause: "Player has no save data",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum && nimblebitAuth.host === "https://sync.nimblebit.com") {
        return yield* new NimblebitError.NimblebitError({
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
export const sync_pushSave = Effect.fn("sync_pushSave")(function* ({
    data,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & { data: Schema.Schema.Type<typeof SaveData> }) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPushSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const dataAsUint8Array = Pako.deflate(yield* Schema.encode(SaveData)(data));
    const dataAsBase64 = Encoding.encodeBase64(dataAsUint8Array);
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${dataAsBase64}${Redacted.value(playerAuthKey)}`);
    const saveVersion = yield* sync_checkForNewerSave({ playerAuthKey, playerId });

    const response = yield* endpoint({
        path: { playerId, salt, hash },
        payload: {
            mg: data.maxGold,
            doorman: data.doorman,
            data: dataAsUint8Array,
            level: data.stories.length,
            saveVersion: saveVersion + 1,
            reqFID: -1, // TODO: pass as parameter
            vip: true,
            p: "Android",
            l: "en-us",
        },
    });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPushSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotSaved") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPushSave",
            module: "SyncManagementGroup",
            cause: "Save data could not be saved",
        });
    }

    return yield* Effect.void;
});

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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncCheckForNewerSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncCheckForNewerSave",
            module: "SyncManagementGroup",
            cause: "Player has no save data",
        });
    }

    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + String(response.saveId) + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum && nimblebitAuth.host === "https://sync.nimblebit.com") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSnapshot",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${snapshotId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash, snapshotId } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: "Snapshot not found",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + salt + response.snapshotId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum && nimblebitAuth.host === "https://sync.nimblebit.com") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPullSnapshot",
            module: "SyncManagementGroup",
            cause: "Checksum mismatch",
        });
    }

    return {
        snapshotId: response.snapshotId,
        data: Pako.inflate(response.data, { to: "string" }),
    };
});

/**
 * Pushes a snapshot to the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const sync_pushSnapshot = Effect.fn("sync_pushSnapshot")(function* ({
    data,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & { data: Schema.Schema.Type<typeof SaveData> }) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPushSnapshot",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const dataAsUint8Array = Pako.deflate(yield* Schema.encode(SaveData)(data));
    const dataAsBase64 = Encoding.encodeBase64(dataAsUint8Array);
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${dataAsBase64}${Redacted.value(playerAuthKey)}`);
    const saveVersion = yield* sync_checkForNewerSave({ playerAuthKey, playerId });

    const response = yield* endpoint({
        path: { playerId, salt, hash },
        payload: {
            mg: data.maxGold,
            doorman: data.doorman,
            data: dataAsUint8Array,
            level: data.stories.length,
            saveVersion,
            reqFID: -1, // TODO: pass as parameter
            vip: true,
            p: "Android",
            l: "en-us",
        },
    });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPushSnapshot",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotSaved") {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncPushSnapshot",
            module: "SyncManagementGroup",
            cause: "Snapshot data could not be saved",
        });
    }

    return yield* Effect.void;
});

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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncRetrieveSnapshotList",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SyncRetrieveSnapshotList",
            module: "SyncManagementGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnter",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "RaffleEnter",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotEntered") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnterMulti",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "RaffleEnterMulti",
            module: "RaffleGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotEntered") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleCheckEnteredCurrent",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
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
export const social_sendItem = Effect.fn("social_sendItem")(function* ({
    friendId,
    itemStr,
    itemType,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & {
    itemStr: string;
    itemType: (typeof SyncItemType)[keyof typeof SyncItemType];
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialSendItem",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(
        `tt/${itemType}/${playerId}/${salt}${itemStr}${Redacted.value(playerAuthKey)}`
    );

    const response = yield* endpoint({
        payload: { itemStr },
        path: { playerId, friendId, salt, hash, syncItemType: itemType },
    });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialSendItem",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotSent") {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialSendItem",
            module: "SocialGroup",
            cause: "Item could not be sent",
        });
    }

    return yield* Effect.void;
});

/**
 * Retrieves gifts sent to the player but does not mark them as received.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_getGifts = Effect.fn("social_getGifts")(function* ({
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialGetGifts",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialGetGifts",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialGetGifts",
            module: "SocialGroup",
            cause: "Gifts could not be found",
        });
    }

    return {
        total: response.total,
        gifts: response.gifts,
    };
});

/**
 * Marks a gift sent to the player as received.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_receiveGift = Effect.fn("social_receiveGift")(function* ({
    giftId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & { giftId: number }) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialReceiveGift",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${giftId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, giftId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialReceiveGift",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotReceived") {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialReceiveGift",
            module: "SocialGroup",
            cause: "Gift could not be received",
        });
    }

    return yield* Effect.void;
});

/**
 * Pulls metadata about a friend's tower from the Nimblebit servers.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_pullFriendMeta = Effect.fn("social_pullFriendMeta")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialPullFriendMeta",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${friendId}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash }, payload: { friends: friendId } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendMeta",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendMeta",
            module: "SocialGroup",
            cause: "Friend tower not found",
        });
    }

    return response.meta[friendId];
});

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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialPullFriendTower",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendTower",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialPullFriendTower",
            module: "SocialGroup",
            cause: "Friend tower not found",
        });
    }

    const dataAsBase64 = Encoding.encodeBase64(response.data);
    const checksum = yield* nimblebitAuth.sign(
        playerId + friendId + salt + response.saveId + dataAsBase64 + Redacted.value(playerAuthKey)
    );

    if (checksum !== response.checksum && nimblebitAuth.host === "https://sync.nimblebit.com") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialRetrieveFriendsSnapshotList",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, friendId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialRetrieveFriendsSnapshotList",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
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
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialGetVisits",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ path: { playerId, salt, hash } });

    if ("error" in response) {
        return yield* new NimblebitError.NimblebitError({
            method: "SocialGetVisits",
            module: "SocialGroup",
            cause: response.error,
        });
    }

    if (response.success === "NotFound") {
        return yield* new NimblebitError.NimblebitError({
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

/**
 * Sends a visit to a friend's tower.
 *
 * @since 1.0.0
 * @category SDK
 */
export const social_visit = Effect.fn("social_visit")(function* ({
    friendId,
    playerAuthKey,
    playerId,
}: Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>;
}) {
    const { data: saveData } = yield* sync_pullSave({ playerAuthKey, playerId });
    const { doorman } = yield* Schema.decode(SaveData)(saveData);
    const doormanItemStr = yield* Schema.encode(Bitizen.Bitizen)(doorman);
    yield* social_sendItem({
        playerId,
        playerAuthKey,
        friendId,
        itemStr: doormanItemStr,
        itemType: SyncItemType.Visit,
    });
});

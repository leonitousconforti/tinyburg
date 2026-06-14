/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */

import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Function from "effect/Function";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { NimblebitAuth, NimblebitConfig, NimblebitError, NimblebitSchema } from "@tinyburg/nimblebit-sdk";
import * as Pako from "pako";

import * as BitbookPost from "./BitbookPosts.ts";
import * as Bitizen from "./Bitizens.ts";
import * as Endpoints from "./Endpoints.ts";
import * as Floor from "./Floors.ts";
import * as Mission from "./Missions.ts";
import * as SyncItemType from "./SyncItemType.ts";

/**
 * How to decode a SaveData from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = Schema.suspend(() => {
    const FriendWithTimestamp = Schema.TemplateLiteralParser([
        Schema.String,
        "|",
        NimblebitConfig.PlayerIdSchema,
        "|",
        NimblebitSchema.CSharpDate,
    ]).pipe(
        Schema.decodeTo(
            Schema.Struct({
                displayName: Schema.String,
                friendId: Schema.toType(NimblebitConfig.PlayerIdSchema),
                timestamp: Schema.toType(NimblebitSchema.CSharpDate),
            }),
            SchemaTransformation.transform({
                encode: ({ displayName, friendId, timestamp }) => [displayName, "|", friendId, "|", timestamp] as const,
                decode: ([displayName, _, friendId, __, timestamp]) => ({ displayName, friendId, timestamp }) as const,
            })
        )
    );

    const FriendWithoutTimestamp = Schema.TemplateLiteralParser([
        Schema.String,
        "|",
        NimblebitConfig.PlayerIdSchema,
    ]).pipe(
        Schema.decodeTo(
            Schema.Struct({
                displayName: Schema.String,
                friendId: Schema.toType(NimblebitConfig.PlayerIdSchema),
            }),
            SchemaTransformation.transform({
                encode: ({ displayName, friendId }) => [displayName, "|", friendId] as const,
                decode: ([displayName, _, friendId]) => ({ displayName, friendId }) as const,
            })
        )
    );

    const FriendSchema = Schema.Union([FriendWithTimestamp, FriendWithoutTimestamp]);
    const FriendsSchema = Schema.String.pipe(NimblebitSchema.split(), Schema.decodeTo(Schema.Array(FriendSchema)));
    const FriendListSchema = Schema.String.pipe(Schema.decodeTo(Schema.Union([Schema.Literal(""), FriendsSchema])));

    const BannedFriendsSchema = Schema.String.pipe(
        NimblebitSchema.split(),
        Schema.decodeTo(Schema.Array(Schema.String))
    );

    const from = Schema.String;
    const to = Schema.Struct({
        coins: Schema.NumberFromString.pipe(
            Schema.decodeTo(Schema.Int),
            Schema.annotateKey({ nimblebitSaveDataKey: "Pc" })
        ),
        bux: Schema.NumberFromString.pipe(
            Schema.decodeTo(Schema.Int),
            Schema.annotateKey({ nimblebitSaveDataKey: "Pb" })
        ),
        Ppig: Schema.String.pipe(Schema.optionalKey),
        Pplim: Schema.String.pipe(Schema.optionalKey),
        maxGold: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pmg" }),
        gold: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pg" }),
        tip: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Ptip" }),
        needUpgrade: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pnu" }),
        ver: Schema.String.annotateKey({ nimblebitSaveDataKey: "Pver" }),
        roof: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pr" }),
        lift: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pe" }),
        lobby: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pl" }),
        buxBought: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pbxb" }),
        installTime: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "PiT" }),
        lastSaleTick: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "PlST" }),
        lobbyName: Schema.String.annotateKey({ nimblebitSaveDataKey: "Pln" }),
        raffleID: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Prf" }),
        vipTrialEnd: Schema.BigIntFromString.annotateKey({ nimblebitSaveDataKey: "Pvte" }),
        costumes: Schema.String.pipe(NimblebitSchema.split(), Schema.annotateKey({ nimblebitSaveDataKey: "Pcos" })),
        pets: Schema.String.pipe(
            NimblebitSchema.split(),
            Schema.annotateKey({ nimblebitSaveDataKey: "Ppets" }),
            Schema.optionalKey
        ),
        missionHist: Schema.String.pipe(
            NimblebitSchema.split(),
            Schema.annotateKey({ nimblebitSaveDataKey: "Pmhst" }),
            Schema.optionalKey
        ),
        bbHist: Schema.String.pipe(NimblebitSchema.split(), Schema.annotateKey({ nimblebitSaveDataKey: "Pbhst" })),
        roofs: Schema.String.pipe(NimblebitSchema.split(), Schema.annotateKey({ nimblebitSaveDataKey: "Prfs" })),
        lifts: Schema.String.pipe(NimblebitSchema.split(), Schema.annotateKey({ nimblebitSaveDataKey: "Plfs" })),
        lobbies: Schema.String.pipe(NimblebitSchema.split(), Schema.annotateKey({ nimblebitSaveDataKey: "Plbs" })),
        bannedFriends: BannedFriendsSchema.pipe(
            Schema.optionalKey,
            Schema.annotateKey({ nimblebitSaveDataKey: "Pbf" })
        ),
        liftSpeed: Schema.NumberFromString.pipe(
            Schema.annotateKey({ nimblebitSaveDataKey: "Pls" }),
            Schema.optionalKey
        ),
        totalPoints: Schema.BigIntFromString.annotateKey({ nimblebitSaveDataKey: "Ptp" }),
        lrc: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plrc" }),
        lfc: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plfc" }),
        cfd: Schema.String.annotateKey({ nimblebitSaveDataKey: "Pcfd" }),
        lbc: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plbc" }),
        lbbcp: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plbbcp" }),
        lcmiss: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plcmiss" }),
        lcg: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plcg" }),
        sfx: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Psfx" }),
        mus: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pmus" }),
        notes: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pnts" }),
        autoLiftDisable: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pald" }),
        videos: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pvds" }),
        vidCheck: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pvdc" }),
        bbnotes: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Pbbn" }),
        hidechat: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Phchat" }),
        tmi: Schema.String.annotateKey({ nimblebitSaveDataKey: "Ptmi" }),
        PVF: Schema.String.pipe(Schema.optionalKey),
        PHP: Schema.String.pipe(Schema.optionalKey),
        mission: Mission.Mission.pipe(Schema.optionalKey, Schema.annotateKey({ nimblebitSaveDataKey: "Pmiss" })),
        doorman: Bitizen.Bitizen.annotateKey({ nimblebitSaveDataKey: "Pdrmn" }),
        playerID: Schema.String.annotateKey({ nimblebitSaveDataKey: "Ppid" }),
        playerRegistered: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "Preg" }),
        bzns: Schema.String.pipe(
            NimblebitSchema.split({ separator: "|" }),
            Schema.decodeTo(Schema.Array(Bitizen.Bitizen)),
            Schema.annotateKey({ nimblebitSaveDataKey: "Pbits" })
        ),
        stories: Schema.String.pipe(
            NimblebitSchema.split({ separator: "|" }),
            Schema.decodeTo(Schema.Array(Floor.Floor)),
            Schema.annotateKey({ nimblebitSaveDataKey: "Pstories" })
        ),
        friends: FriendListSchema.pipe(Schema.optionalKey, Schema.annotateKey({ nimblebitSaveDataKey: "Pfrns" })),
        bbPosts: Schema.String.pipe(
            NimblebitSchema.split({ separator: "|" }),
            Schema.decodeTo(Schema.Array(BitbookPost.BitbookPost)),
            Schema.annotateKey({ nimblebitSaveDataKey: "PBB" })
        ),
        bbpost: Schema.String.annotateKey({ nimblebitSaveDataKey: "Plp" }),
    }).pipe(NimblebitSchema.parseNimblebitObject);

    const transformation = SchemaTransformation.transform({
        encode: (input: string) => `[_save]${input}[_save]`,
        decode: (input: string) => (input.startsWith('"') ? input.slice(8, -8) : input.slice(7, -7)),
    });

    return from.pipe(Schema.decodeTo(to, transformation));
});

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

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceNewPlayer",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt1 = yield* nimblebitAuth.salt;
    const salt2 = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${salt1}/${salt2}`);
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
 * Retrieves player details from the Nimblebit servers.
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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
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

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "DeviceManagementGroup",
        endpoint: "DeviceVerifyDevice",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const playerId = yield* Effect.map(nimblebitAuth.burnbot, ({ playerId }) => playerId);
    const response = yield* endpoint({ params: { playerId, verificationCode } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.UnauthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
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
        params: { playerId: burnbot.playerId, salt, hash },
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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    data: Schema.Schema.Type<typeof SaveData>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPushSave",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const dataAsUint8Array = Pako.deflate(yield* Schema.encodeEffect(SaveData)(data));
    const dataAsBase64 = Encoding.encodeBase64(dataAsUint8Array);
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${dataAsBase64}${Redacted.value(playerAuthKey)}`);
    const saveVersion = yield* sync_checkForNewerSave({ playerAuthKey, playerId });

    const response = yield* endpoint({
        params: { playerId, salt, hash },
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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
        playerId + salt + response.saveId.toString() + Redacted.value(playerAuthKey)
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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & { snapshotId: number }) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPullSnapshot",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${snapshotId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash, snapshotId } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    data: Schema.Schema.Type<typeof SaveData>;
}) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SyncManagementGroup",
        endpoint: "SyncPushSnapshot",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const dataAsUint8Array = Pako.deflate(yield* Schema.encodeEffect(SaveData)(data));
    const dataAsBase64 = Encoding.encodeBase64(dataAsUint8Array);
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${dataAsBase64}${Redacted.value(playerAuthKey)}`);
    const saveVersion = yield* sync_checkForNewerSave({ playerAuthKey, playerId });

    const response = yield* endpoint({
        params: { playerId, salt, hash },
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
        endpoint: "SyncRetrieveSnapshotList",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnter",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleEnterMulti",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "RaffleGroup",
        endpoint: "RaffleCheckEnteredCurrent",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    itemStr: string;
    itemType: (typeof SyncItemType.SyncItemType)[keyof typeof SyncItemType.SyncItemType];
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
        endpoint: "SocialSendItem",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(
        `tt/${itemType}/${playerId}/${friendId}/${salt}${itemStr}${Redacted.value(playerAuthKey)}`
    );

    const response = yield* endpoint({
        payload: { itemStr },
        params: { playerId, friendId, salt, hash, syncItemType: itemType },
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
        endpoint: "SocialGetGifts",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & { giftId: number }) {
    const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;
    const httpClient = yield* HttpClient.HttpClient;

    const maybeAddBearerToken =
        nimblebitAuth.host !== "https://sync.nimblebit.com"
            ? HttpClientRequest.bearerToken(nimblebitAuth.authKey)
            : Function.identity;

    const endpoint = yield* HttpApiClient.endpoint(Endpoints.Api, {
        baseUrl: nimblebitAuth.host,
        group: "SocialGroup",
        endpoint: "SocialReceiveGift",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${giftId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, giftId, salt, hash } });

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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${friendId}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash }, payload: { friends: friendId } });

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
        endpoint: "SocialPullFriendTower",
        httpClient: HttpClient.mapRequest(httpClient, maybeAddBearerToken),
    });

    const salt = yield* nimblebitAuth.salt;
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, friendId, salt, hash } });

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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${friendId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, friendId, salt, hash } });

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
    const hash = yield* nimblebitAuth.sign(`tt/${playerId}/${salt}${Redacted.value(playerAuthKey)}`);
    const response = yield* endpoint({ params: { playerId, salt, hash } });

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
}: Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema> & {
    friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>;
}) {
    const { data: saveData } = yield* sync_pullSave({ playerAuthKey, playerId });
    const { doorman } = yield* Schema.decodeEffect(SaveData)(saveData);
    const doormanItemStr = yield* Schema.encodeEffect(Bitizen.Bitizen)(doorman);
    yield* social_sendItem({
        playerId,
        playerAuthKey,
        friendId,
        itemStr: doormanItemStr,
        itemType: SyncItemType.SyncItemType.Visit,
    });
});

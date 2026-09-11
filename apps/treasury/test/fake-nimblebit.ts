/**
 * A fake Nimblebit sync service, for the dev stack.
 *
 * There is no staging Nimblebit, so end-to-end trades need a stand-in: this
 * serves the TinyTower sdk's own `Endpoints.Api` over in-memory state. Point
 * the treasury's vault at it with `TREASURY_NIMBLEBIT_HOST`, and tinyburg.app
 * with `TINYBURGAPP_NIMBLEBIT_HOST`, and the whole escrow loop - deposits,
 * the vault's gift queue, releases, refunds, splices - runs against towers
 * that exist only in this process.
 *
 * Faithful where the treasury depends on it, careless everywhere else:
 * hashes and salts are accepted without checking (both callers use custom
 * hosts, whose clients skip checksum verification), towers are created the
 * first time anything references them, and the emailed verification code is
 * always `123456`. Restarting it forgets everything, which is a feature.
 */

import { Config, ConfigProvider, Effect, Layer, Redacted, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import * as crypto from "node:crypto";
import { createServer } from "node:http";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";

import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Endpoints } from "@tinyburg/tinytower-sdk";

type PlayerId = typeof NimblebitConfig.PlayerIdSchema.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

interface FakeGift {
    readonly id: number;
    readonly to: PlayerId;
    readonly from: PlayerId;
    readonly type: SyncItemTypeValue;
    readonly contents: string;
}

interface FakeTower {
    readonly authKey: string;
    email: string;
    save: { data: Uint8Array; saveId: number } | undefined;
    snapshots: Array<{ id: number; data: Uint8Array }>;
    gifts: Array<FakeGift>;
}

const VERIFICATION_CODE = "123456";

const decodePlayerId = Schema.decodeUnknownEffect(NimblebitConfig.PlayerIdSchema);
const decodeAuthKey = Schema.decodeUnknownEffect(NimblebitConfig.PlayerAuthKeySchema);
const decodeEmail = Schema.decodeUnknownEffect(NimblebitConfig.PlayerEmailSchema);

const randomPlayerId = (): string =>
    Array.from(crypto.randomBytes(5), (byte) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[byte % 31]).join("");

// The whole world: towers by player id, plus the email a burn bot last asked
// a code for, so verify_device can answer with the right account.
const towers = new Map<string, FakeTower>();
const pendingEmails = new Map<string, string>();
let nextGiftId = 1;

const towerFor = (playerId: string): FakeTower => {
    const existing = towers.get(playerId);
    if (existing !== undefined) return existing;
    const created: FakeTower = {
        authKey: crypto.randomBytes(16).toString("hex"),
        email: `${playerId.toLowerCase()}@fake.invalid`,
        save: undefined,
        snapshots: [],
        gifts: [],
    };
    towers.set(playerId, created);
    return created;
};

const DeviceManagementLive = HttpApiBuilder.group(
    Endpoints.Api,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("DeviceNewPlayer", () =>
                Effect.gen(function* () {
                    const playerId = yield* decodePlayerId(randomPlayerId()).pipe(Effect.orDie);
                    const tower = towerFor(playerId);
                    return {
                        playerId,
                        playerSs: yield* decodeAuthKey(tower.authKey).pipe(Effect.orDie),
                    };
                })
            )
            .handle("DevicePlayerDetails", ({ params }) =>
                Effect.gen(function* () {
                    const tower = towerFor(params.playerId);
                    return {
                        player: {
                            playerId: params.playerId,
                            playerEmail: yield* decodeEmail(tower.email).pipe(Effect.orDie),
                            registered: true,
                            blacklisted: false,
                        },
                    };
                })
            )
            .handle("DeviceRegisterEmail", ({ params, payload }) =>
                Effect.gen(function* () {
                    pendingEmails.set(params.playerId, Redacted.value(payload.email));
                    yield* Effect.logInfo(
                        `register_email for ${params.playerId}: the verification code is always ${VERIFICATION_CODE}`
                    );
                    return { success: "NewEmail" as const };
                })
            )
            .handle("DeviceVerifyDevice", ({ params }) =>
                Effect.gen(function* () {
                    const email = pendingEmails.get(params.playerId);
                    if (params.verificationCode !== VERIFICATION_CODE || email === undefined) {
                        return { error: "InvalidCode" };
                    }
                    // The account that owns the email: an existing tower with
                    // it, or a brand new one, exactly like linking a fresh
                    // save in the real flow.
                    const owned = [...towers.entries()].find(([, tower]) => tower.email === email);
                    const playerId = yield* decodePlayerId(owned?.[0] ?? randomPlayerId()).pipe(Effect.orDie);
                    const tower = towerFor(playerId);
                    tower.email = email;
                    return {
                        success: "NewDevice" as const,
                        playerId,
                        playerAuthKey: yield* decodeAuthKey(tower.authKey).pipe(Effect.orDie),
                        playerEmail: yield* decodeEmail(email).pipe(Effect.orDie),
                    };
                })
            );
    })
);

const SyncManagementLive = HttpApiBuilder.group(
    Endpoints.Api,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        return (
            handlers
                .handle("SyncPullSave", ({ params }) =>
                    Effect.sync(() => {
                        const tower = towerFor(params.playerId);
                        if (tower.save === undefined) return { success: "NotFound" as const };
                        return {
                            success: "Found" as const,
                            data: tower.save.data,
                            checksum: "fake",
                            saveId: tower.save.saveId,
                        };
                    })
                )
                .handle("SyncPushSave", ({ params, payload }) =>
                    Effect.sync(() => {
                        const tower = towerFor(params.playerId);
                        tower.save = {
                            data: payload.data,
                            saveId: (tower.save?.saveId ?? 0) + 1,
                        };
                        return { success: "Saved" as const };
                    })
                )
                .handle("SyncCheckForNewerSave", ({ params }) =>
                    Effect.sync(() => {
                        const tower = towerFor(params.playerId);
                        // Version 0 rather than NotFound for a fresh tower:
                        // the sdk's push asks for the current version first,
                        // and a tower nobody pushed to yet must accept its
                        // first save rather than refuse it.
                        return { success: "Found" as const, checksum: "fake", saveId: tower.save?.saveId ?? 0 };
                    })
                )
                .handle("SyncPushSnapshot", ({ params, payload }) =>
                    Effect.sync(() => {
                        const tower = towerFor(params.playerId);
                        tower.snapshots.push({ id: tower.snapshots.length + 1, data: payload.data });
                        return { success: "Saved" as const };
                    })
                )
                .handle("SyncPullSnapshot", ({ params }) =>
                    Effect.sync(() => {
                        const tower = towerFor(params.playerId);
                        const snapshot = tower.snapshots.find((candidate) => candidate.id === params.snapshotId);
                        if (snapshot === undefined) return { success: "NotFound" as const };
                        return {
                            success: "Found" as const,
                            data: snapshot.data,
                            checksum: "fake",
                            snapshotId: snapshot.id,
                        };
                    })
                )
                // Listing snapshots needs a PlayerMetaData (a decoded doorman and
                // all); nothing in the treasury reads the list, so it is empty
                // rather than fabricated.
                .handle("SyncRetrieveSnapshotList", () => Effect.succeed({ success: "Found" as const, saves: [] }))
        );
    })
);

const RaffleLive = HttpApiBuilder.group(
    Endpoints.Api,
    "RaffleGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("RaffleEnter", () => Effect.succeed({ success: "Entered" as const }))
            .handle("RaffleEnterMulti", () => Effect.succeed({ success: "Entered" as const }))
            .handle("RaffleCheckEnteredCurrent", () => Effect.succeed({ success: "NotEntered" as const }));
    })
);

const SocialLive = HttpApiBuilder.group(
    Endpoints.Api,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("SocialSendItem", ({ params, payload }) =>
                Effect.gen(function* () {
                    const recipient = towerFor(params.friendId);
                    const gift: FakeGift = {
                        id: nextGiftId,
                        to: params.friendId,
                        from: params.playerId,
                        type: params.syncItemType,
                        contents: payload.itemStr,
                    };
                    nextGiftId = nextGiftId + 1;
                    recipient.gifts.push(gift);
                    yield* Effect.logInfo(
                        `gift ${gift.id}: ${params.playerId} -> ${params.friendId} (${params.syncItemType})`
                    );
                    return { success: "Sent" as const };
                })
            )
            .handle("SocialGetGifts", ({ params }) =>
                Effect.sync(() => {
                    const tower = towerFor(params.playerId);
                    return {
                        success: "Found" as const,
                        total: tower.gifts.length,
                        gifts: tower.gifts.map((gift) => ({ ...gift, checksum: "fake", c: null })),
                    };
                })
            )
            .handle("SocialReceiveGift", ({ params }) =>
                Effect.sync(() => {
                    const tower = towerFor(params.playerId);
                    const index = tower.gifts.findIndex((gift) => gift.id === params.giftId);
                    if (index === -1) return { success: "NotReceived" as const };
                    tower.gifts.splice(index, 1);
                    return { success: "Received" as const };
                })
            )
            .handle("SocialPullFriendMeta", () => Effect.succeed({ success: "NotFound" as const }))
            .handle("SocialPullFriendTower", ({ params }) =>
                Effect.sync(() => {
                    const friend = towerFor(params.friendId);
                    if (friend.save === undefined) return { success: "NotFound" as const };
                    return {
                        success: "Found" as const,
                        data: friend.save.data,
                        checksum: "fake",
                        saveId: friend.save.saveId,
                        playerId: params.friendId,
                    };
                })
            )
            .handle("SocialRetrieveFriendsSnapshotList", () => Effect.succeed({ success: "Found" as const, saves: [] }))
            .handle("SocialGetVisits", () => Effect.succeed({ success: "Found" as const, total: 0, gifts: [] }));
    })
);

const ApiLive = HttpApiBuilder.layer(Endpoints.Api).pipe(
    Layer.provide([DeviceManagementLive, SyncManagementLive, RaffleLive, SocialLive])
);

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("FAKENIMBLEBIT"));

/**
 * Custom-host clients sign by base64url-encoding the whole preimage into the
 * hash path segment, and a save push's preimage contains the save itself -
 * so the fake must swallow multi-megabyte request lines where a real server
 * would refuse them.
 */
const createRoomyServer: typeof createServer = (options?: object) =>
    createServer({ ...options, maxHeaderSize: 16 * 1024 * 1024 });

HttpRouter.serve(ApiLive, { routerConfig: { maxParamLength: 16 * 1024 * 1024 } }).pipe(
    Layer.provide(
        NodeHttpServer.layerConfig(createRoomyServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3005)),
            host: Config.string("HOST").pipe(Config.withDefault("127.0.0.1")),
        })
    ),
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provide(NodeServices.layer),
    Layer.launch,
    NodeRuntime.runMain
);

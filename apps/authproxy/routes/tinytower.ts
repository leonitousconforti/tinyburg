import type { HttpClientError } from "effect/unstable/http";

import { Context, Effect, Function, Layer, type Schema } from "effect";
import { HttpApiBuilder, HttpApiClient, HttpApiError } from "effect/unstable/httpapi";

import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { Endpoints as TinyTowerEndpoints } from "@tinyburg/tinytower-sdk";

import { Authorization, AuthorizationLive } from "../middleware/10_authorization.ts";
import { AuthProxyApiDecodeHash, AuthProxyApiDecodeHashLive } from "../middleware/20_tinytowerDecode.ts";

/** @internal */
class Client extends Context.Service<Client>()("Client", {
    make: HttpApiClient.make(TinyTowerEndpoints.Api, {
        baseUrl: "https://sync.nimblebit.com",
    }),
}) {
    static readonly Default = Layer.effect(Client, Client.make);
}

/** @internal */
const catch500s = <A, E, R>(effect: Effect.Effect<A, E | Schema.SchemaError | HttpClientError.HttpClientError, R>) =>
    effect.pipe(
        Effect.catchTag("SchemaError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("HttpClientError", () => new HttpApiError.InternalServerError())
    );

/** @internal */
const Api = TinyTowerEndpoints.Api.middleware(Authorization).middleware(AuthProxyApiDecodeHash);

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const RaffleLive = HttpApiBuilder.group(
    Api,
    "RaffleGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.RaffleGroup);
        const enterRaffle = Function.compose(client.RaffleEnter, catch500s);
        const enterMultiRaffle = Function.compose(client.RaffleEnterMulti, catch500s);
        const checkEnteredRaffle = Function.compose(client.RaffleCheckEnteredCurrent, catch500s);
        return handlers
            .handle("RaffleEnter", enterRaffle)
            .handle("RaffleEnterMulti", enterMultiRaffle)
            .handle("RaffleCheckEnteredCurrent", checkEnteredRaffle);
    })
);

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const DeviceManagementLive = HttpApiBuilder.group(
    Api,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.DeviceManagementGroup);
        const newPlayer = () => Effect.fail(new HttpApiError.Forbidden());
        const verifyDevice = Function.compose(client.DeviceVerifyDevice, catch500s);
        const registerEmail = Function.compose(client.DeviceRegisterEmail, catch500s);
        const playerDetails = Function.compose(client.DevicePlayerDetails, catch500s);
        return handlers
            .handle("DeviceNewPlayer", newPlayer)
            .handle("DeviceVerifyDevice", verifyDevice)
            .handle("DeviceRegisterEmail", registerEmail)
            .handle("DevicePlayerDetails", playerDetails);
    })
);

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const SyncManagementLive = HttpApiBuilder.group(
    Api,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SyncManagementGroup);
        const checkForNewerSave = Function.compose(client.SyncCheckForNewerSave, catch500s);
        const pullSave = Function.compose(client.SyncPullSave, catch500s);
        const pullSnapshot = Function.compose(client.SyncPullSnapshot, catch500s);
        const pushSave = Function.compose(client.SyncPushSave, catch500s);
        const pushSnapshot = Function.compose(client.SyncPushSnapshot, catch500s);
        const retrieveSnapshotList = Function.compose(client.SyncRetrieveSnapshotList, catch500s);
        return handlers
            .handle("SyncCheckForNewerSave", checkForNewerSave)
            .handle("SyncPullSave", pullSave)
            .handle("SyncPullSnapshot", pullSnapshot)
            .handle("SyncPushSave", pushSave)
            .handle("SyncPushSnapshot", pushSnapshot)
            .handle("SyncRetrieveSnapshotList", retrieveSnapshotList);
    })
);

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const SocialGroupLive = HttpApiBuilder.group(
    Api,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SocialGroup);
        const getGifts = Function.compose(client.SocialGetGifts, catch500s);
        const pullFriendTower = Function.compose(client.SocialPullFriendTower, catch500s);
        const getVisits = Function.compose(client.SocialGetVisits, catch500s);
        const pullFriendMeta = Function.compose(client.SocialPullFriendMeta, catch500s);
        const receiveGift = Function.compose(client.SocialReceiveGift, catch500s);
        const friendsSnapshots = Function.compose(client.SocialRetrieveFriendsSnapshotList, catch500s);
        const sendItem = Function.compose(client.SocialSendItem, catch500s);
        return handlers
            .handle("SocialGetGifts", getGifts)
            .handle("SocialPullFriendTower", pullFriendTower)
            .handle("SocialGetVisits", getVisits)
            .handle("SocialPullFriendMeta", pullFriendMeta)
            .handle("SocialReceiveGift", receiveGift)
            .handle("SocialRetrieveFriendsSnapshotList", friendsSnapshots)
            .handle("SocialSendItem", sendItem);
    })
);

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const TinyTowerApiLive = HttpApiBuilder.layer(Api).pipe(
    Layer.provide([RaffleLive, DeviceManagementLive, SyncManagementLive, SocialGroupLive]),
    Layer.provide([AuthorizationLive, AuthProxyApiDecodeHashLive]),
    Layer.provide(NimblebitAuth.layerDirectConfig()),
    Layer.provide(Client.Default)
);

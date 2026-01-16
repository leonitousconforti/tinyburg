import { HttpApiBuilder, HttpApiClient, HttpApiError, HttpLayerRouter, type HttpClientError } from "@effect/platform";
import { Endpoints as TinyTowerEndpoints } from "@tinyburg/tinytower-sdk";
import { Effect, Function, Layer, type ParseResult } from "effect";

/** @internal */
class Client extends Effect.Service<Client>()("Client", {
    accessors: false,
    dependencies: [],
    effect: HttpApiClient.make(TinyTowerEndpoints.Api, {
        baseUrl: "https://sync.nimblebit.com",
    }),
}) {}

/** @internal */
const catch500s = <A, E, R>(
    effect: Effect.Effect<A, E | ParseResult.ParseError | HttpClientError.HttpClientError, R>
): Effect.Effect<A, E | HttpApiError.InternalServerError, R> =>
    effect.pipe(
        Effect.catchTag("ParseError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("RequestError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("ResponseError", () => new HttpApiError.InternalServerError())
    );

/**
 * @since 1.0.0
 * @category TinyTower Routes
 */
export const RaffleLive = HttpApiBuilder.group(
    TinyTowerEndpoints.Api,
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
    TinyTowerEndpoints.Api,
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
    TinyTowerEndpoints.Api,
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
    TinyTowerEndpoints.Api,
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
export const AllTinyTowerRoutes = HttpLayerRouter.addHttpApi(TinyTowerEndpoints.Api).pipe(
    Layer.provide([RaffleLive, DeviceManagementLive, SyncManagementLive, SocialGroupLive]),
    Layer.provide(Client.Default)
);

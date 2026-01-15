import {
    FetchHttpClient,
    HttpApiBuilder,
    HttpApiClient,
    HttpApiError,
    HttpApiMiddleware,
    HttpApiSecurity,
    HttpLayerRouter,
    HttpMiddleware,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
    PlatformConfigProvider,
    type HttpClientError,
} from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { TinyTower, Endpoints as TinyTowerEndpoints } from "@tinyburg/tinytower-sdk";
import { Config, Context, Effect, Function, Layer, Option, Redacted, Schema, String, type ParseResult } from "effect";
import { createServer } from "node:http";

class Account extends Schema.Class<Account>("Account")({ scopes: Schema.Array(Schema.String) }) {}
class CurrentAccount extends Context.Tag("CurrentAccount")<CurrentAccount, Account>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
    provides: CurrentAccount,
    failure: HttpApiError.Unauthorized,
    security: {
        myBearer: HttpApiSecurity.bearer,
    },
}) {}

const AuthorizationLive = Layer.effect(
    Authorization,
    Effect.gen(function* () {
        return {
            myBearer: Effect.fnUntraced(function* (bearerToken) {
                yield* Effect.log(`checking bearer token ${Redacted.value(bearerToken)}`);
                return new Account({ scopes: [] });
                // return yield* new HttpApiError.Unauthorized();
            }),
        };
    })
);

class Client extends Effect.Service<Client>()("Client", {
    accessors: false,
    dependencies: [FetchHttpClient.layer],
    effect: HttpApiClient.make(TinyTowerEndpoints.Api, { baseUrl: "https://sync.nimblebit.com" }),
}) {}

const ApiWithAuthorizationMiddleware = TinyTowerEndpoints.Api.middleware(Authorization);

const catch500 = <A, E, R>(
    effect: Effect.Effect<A, E | ParseResult.ParseError | HttpClientError.HttpClientError, R>
): Effect.Effect<A, E | HttpApiError.InternalServerError, R> =>
    effect.pipe(
        Effect.catchTag("ParseError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("RequestError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("ResponseError", () => new HttpApiError.InternalServerError())
    );

const RaffleLive = HttpApiBuilder.group(
    ApiWithAuthorizationMiddleware,
    "RaffleGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.RaffleGroup);
        const enterRaffle = Function.compose(client.RaffleEnter, catch500);
        const enterMultiRaffle = Function.compose(client.RaffleEnterMulti, catch500);
        const checkEnteredRaffle = Function.compose(client.RaffleCheckEnteredCurrent, catch500);
        return handlers
            .handle("RaffleEnter", enterRaffle)
            .handle("RaffleEnterMulti", enterMultiRaffle)
            .handle("RaffleCheckEnteredCurrent", checkEnteredRaffle);
    })
);

const DeviceManagementLive = HttpApiBuilder.group(
    ApiWithAuthorizationMiddleware,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.DeviceManagementGroup);
        const newPlayer = () => Effect.fail(new HttpApiError.Forbidden());
        const verifyDevice = Function.compose(client.DeviceVerifyDevice, catch500);
        const registerEmail = Function.compose(client.DeviceRegisterEmail, catch500);
        const playerDetails = Function.compose(client.DevicePlayerDetails, catch500);
        return handlers
            .handle("DeviceNewPlayer", newPlayer)
            .handle("DeviceVerifyDevice", verifyDevice)
            .handle("DeviceRegisterEmail", registerEmail)
            .handle("DevicePlayerDetails", playerDetails);
    })
);

const SyncManagementLive = HttpApiBuilder.group(
    ApiWithAuthorizationMiddleware,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SyncManagementGroup);
        const checkForNewerSave = Function.compose(client.SyncCheckForNewerSave, catch500);
        const pullSave = Function.compose(client.SyncPullSave, catch500);
        const pullSnapshot = Function.compose(client.SyncPullSnapshot, catch500);
        const pushSave = Function.compose(client.SyncPushSave, catch500);
        const pushSnapshot = Function.compose(client.SyncPushSnapshot, catch500);
        const retrieveSnapshotList = Function.compose(client.SyncRetrieveSnapshotList, catch500);
        return handlers
            .handle("SyncCheckForNewerSave", checkForNewerSave)
            .handle("SyncPullSave", pullSave)
            .handle("SyncPullSnapshot", pullSnapshot)
            .handle("SyncPushSave", pushSave)
            .handle("SyncPushSnapshot", pushSnapshot)
            .handle("SyncRetrieveSnapshotList", retrieveSnapshotList);
    })
);

const SocialGroupLive = HttpApiBuilder.group(
    ApiWithAuthorizationMiddleware,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SocialGroup);
        const getGifts = Function.compose(client.SocialGetGifts, catch500);
        const pullFriendTower = Function.compose(client.SocialPullFriendTower, catch500);
        const getVisits = Function.compose(client.SocialGetVisits, catch500);
        const pullFriendMeta = Function.compose(client.SocialPullFriendMeta, catch500);
        const receiveGift = Function.compose(client.SocialReceiveGift, catch500);
        const friendsSnapshots = Function.compose(client.SocialRetrieveFriendsSnapshotList, catch500);
        const sendItem = Function.compose(client.SocialSendItem, catch500);
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

const AuthProxyApiMiddleware = HttpLayerRouter.middleware(
    Effect.map(NimblebitAuth.NimblebitAuth, (auth) =>
        HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const lastSlashIndex = String.lastIndexOf("/")(request.url);
                if (Option.isNone(lastSlashIndex)) return yield* new HttpApiError.BadRequest();

                const encodedHash = request.url.substring(lastSlashIndex.value + 1);
                const decodedHash = Schema.decodeOption(Schema.StringFromBase64Url)(encodedHash);
                if (Option.isNone(decodedHash)) return yield* new HttpApiError.BadRequest();

                const signedHash = yield* auth.sign(decodedHash.value).pipe(Effect.orDie);
                return yield* Effect.updateService(
                    httpAppMiddleware,
                    HttpRouter.RouteContext,
                    (previousRouteContext) => ({
                        ...previousRouteContext,
                        params: { ...previousRouteContext.params, hash: signedHash },
                    })
                );
            })
        )
    )
);

const AuthProxyApiRoutes = HttpLayerRouter.addHttpApi(ApiWithAuthorizationMiddleware).pipe(
    Layer.provide([RaffleLive, DeviceManagementLive, SyncManagementLive, SocialGroupLive, AuthorizationLive]),
    Layer.provide(Client.DefaultWithoutDependencies),
    Layer.provide(AuthProxyApiMiddleware.layer)
);

const HealthCheck = Effect.cachedWithTTL(
    NimblebitAuth.NimblebitAuth.pipe(
        Effect.flatMap((auth) => auth.burnbot),
        Effect.flatMap(TinyTower.raffle_checkEnteredCurrent),
        Effect.as(HttpServerResponse.text("OK", { status: 200 })),
        Effect.orDie
    ),
    "1 hour"
);

const HealthCheckRoute = HealthCheck.pipe(
    Effect.map((execute) => HttpLayerRouter.add("GET", "/healthz", execute)),
    Layer.unwrapEffect
);

const AllRoutes = Layer.mergeAll(AuthProxyApiRoutes, HealthCheckRoute).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(NimblebitAuth.layerNodeDirectConfig())
);

const Port = Config.number("PORT").pipe(Config.withDefault(3000));

HttpLayerRouter.serve(AllRoutes).pipe(
    Layer.provide(PlatformConfigProvider.layerDotEnvAdd(".env")),
    Layer.provide(NodeHttpServer.layerConfig(createServer, { port: Port })),
    Layer.launch,
    NodeRuntime.runMain
);

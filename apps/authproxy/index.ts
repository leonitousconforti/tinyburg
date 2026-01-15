import { RateLimiter } from "@effect/experimental";
import {
    FetchHttpClient,
    Headers,
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
import {
    Config,
    Context,
    Duration,
    Effect,
    Function,
    Layer,
    Option,
    Redacted,
    Schema,
    String,
    type ParseResult,
} from "effect";
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

const catchTo500 = <A, E, R>(
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
        const enterRaffle = Function.compose(client.RaffleEnter, catchTo500);
        const enterMultiRaffle = Function.compose(client.RaffleEnterMulti, catchTo500);
        const checkEnteredRaffle = Function.compose(client.RaffleCheckEnteredCurrent, catchTo500);
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
        const verifyDevice = Function.compose(client.DeviceVerifyDevice, catchTo500);
        const registerEmail = Function.compose(client.DeviceRegisterEmail, catchTo500);
        const playerDetails = Function.compose(client.DevicePlayerDetails, catchTo500);
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
        const checkForNewerSave = Function.compose(client.SyncCheckForNewerSave, catchTo500);
        const pullSave = Function.compose(client.SyncPullSave, catchTo500);
        const pullSnapshot = Function.compose(client.SyncPullSnapshot, catchTo500);
        const pushSave = Function.compose(client.SyncPushSave, catchTo500);
        const pushSnapshot = Function.compose(client.SyncPushSnapshot, catchTo500);
        const retrieveSnapshotList = Function.compose(client.SyncRetrieveSnapshotList, catchTo500);
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
        const getGifts = Function.compose(client.SocialGetGifts, catchTo500);
        const pullFriendTower = Function.compose(client.SocialPullFriendTower, catchTo500);
        const getVisits = Function.compose(client.SocialGetVisits, catchTo500);
        const pullFriendMeta = Function.compose(client.SocialPullFriendMeta, catchTo500);
        const receiveGift = Function.compose(client.SocialReceiveGift, catchTo500);
        const friendsSnapshots = Function.compose(client.SocialRetrieveFriendsSnapshotList, catchTo500);
        const sendItem = Function.compose(client.SocialSendItem, catchTo500);
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
    Effect.gen(function* () {
        const auth = yield* NimblebitAuth.NimblebitAuth;
        const withRateLimiter = yield* RateLimiter.makeWithRateLimiter;

        const consume = Effect.serviceFunctionEffect(
            HttpServerRequest.HttpServerRequest,
            (request: HttpServerRequest.HttpServerRequest) => {
                const headers = request.headers;
                const doConnectingIp = Headers.get(headers, "do-connecting-ip");
                const key = Option.getOrElse(doConnectingIp, () => "unknown");
                return withRateLimiter({
                    key,
                    limit: 3,
                    window: "1 minute",
                    onExceeded: "fail",
                    algorithm: "fixed-window",
                });
            }
        );

        const catchTo429 = <A, E, R>(
            effect: Effect.Effect<A, E | RateLimiter.RateLimitExceeded, R>
        ): Effect.Effect<A | HttpServerResponse.HttpServerResponse, E, R> =>
            Effect.catchIf(
                effect,
                Schema.is(RateLimiter.RateLimitExceeded),
                (rateLimitExceeded: RateLimiter.RateLimitExceeded) =>
                    HttpServerResponse.raw("", {
                        status: 429,
                        contentLength: 0,
                        statusText: "Too Many Requests",
                        headers: {
                            "X-RateLimit-Limit": rateLimitExceeded.limit.toString(),
                            "X-RateLimit-Remaining": rateLimitExceeded.remaining.toString(),
                            "X-RateLimit-Reset": Duration.toSeconds(rateLimitExceeded.retryAfter).toString(),
                        },
                    })
            );

        const middleware = HttpMiddleware.make((httpAppMiddleware) =>
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
        );

        return Function.flow(middleware, consume, catchTo429);
    })
);

const AuthProxyApiRoutes = HttpLayerRouter.addHttpApi(ApiWithAuthorizationMiddleware).pipe(
    Layer.provide([RaffleLive, DeviceManagementLive, SyncManagementLive, SocialGroupLive, AuthorizationLive]),
    Layer.provide(Client.DefaultWithoutDependencies),
    Layer.provide(AuthProxyApiMiddleware.layer),
    Layer.provide(RateLimiter.layer),
    Layer.provide(RateLimiter.layerStoreMemory)
);

const HealthCheck = Effect.cachedWithTTL(
    NimblebitAuth.NimblebitAuth.pipe(
        Effect.flatMap((auth) => auth.burnbot),
        Effect.flatMap(TinyTower.raffle_checkEnteredCurrent),
        Effect.as(HttpServerResponse.text("OK", { status: 200 })),
        Effect.orDie
    ),
    Duration.hours(1)
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

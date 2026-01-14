import type * as HttpClientError from "@effect/platform/HttpClientError";
import type * as ParseResult from "effect/ParseResult";

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import * as HttpApiSecurity from "@effect/platform/HttpApiSecurity";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Function from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import * as http from "node:http";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Endpoints as TinyTowerEndpoints } from "@tinyburg/tinytower-sdk";

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

const ApiWithMiddleware = TinyTowerEndpoints.Api.middleware(Authorization);

const catch500 = <A, E, R>(
    effect: Effect.Effect<A, E | ParseResult.ParseError | HttpClientError.HttpClientError, R>
): Effect.Effect<A, E | HttpApiError.InternalServerError, R> =>
    effect.pipe(
        Effect.catchTag("ParseError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("RequestError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("ResponseError", () => new HttpApiError.InternalServerError())
    );

const RaffleLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "RaffleGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.RaffleGroup);
        const enterRaffle = Function.compose(client.RaffleEnter<false>, catch500);
        const enterMultiRaffle = Function.compose(client.RaffleEnterMulti<false>, catch500);
        const checkEnteredRaffle = Function.compose(client.RaffleCheckEnteredCurrent<false>, catch500);
        return handlers
            .handle("RaffleEnter", enterRaffle)
            .handle("RaffleEnterMulti", enterMultiRaffle)
            .handle("RaffleCheckEnteredCurrent", checkEnteredRaffle);
    })
);

const DeviceManagementLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.DeviceManagementGroup);
        const newPlayer = () => Effect.fail(new HttpApiError.Forbidden());
        const verifyDevice = Function.compose(client.DeviceVerifyDevice<false>, catch500);
        const registerEmail = Function.compose(client.DeviceRegisterEmail<false>, catch500);
        const playerDetails = Function.compose(client.DevicePlayerDetails<false>, catch500);
        return handlers
            .handle("DeviceNewPlayer", Function.compose(newPlayer, catch500))
            .handle("DeviceVerifyDevice", Function.compose(verifyDevice, catch500))
            .handle("DeviceRegisterEmail", Function.compose(registerEmail, catch500))
            .handle("DevicePlayerDetails", Function.compose(playerDetails, catch500));
    })
);

const SyncManagementLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SyncManagementGroup);
        const checkForNewerSave = Function.compose(client.SyncCheckForNewerSave<false>, catch500);
        const pullSave = Function.compose(client.SyncPullSave<false>, catch500);
        const pullSnapshot = Function.compose(client.SyncPullSnapshot<false>, catch500);
        const pushSave = Function.compose(client.SyncPushSave<false>, catch500);
        const pushSnapshot = Function.compose(client.SyncPushSnapshot<false>, catch500);
        const retrieveSnapshotList = Function.compose(client.SyncRetrieveSnapshotList<false>, catch500);
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
    ApiWithMiddleware,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SocialGroup);
        const getGifts = Function.compose(client.SocialGetGifts<false>, catch500);
        const pullFriendTower = Function.compose(client.SocialPullFriendTower<false>, catch500);
        const getVisits = Function.compose(client.SocialGetVisits<false>, catch500);
        const pullFriendMeta = Function.compose(client.SocialPullFriendMeta<false>, catch500);
        const receiveGift = Function.compose(client.SocialReceiveGift<false>, catch500);
        const friendsSnapshots = Function.compose(client.SocialRetrieveFriendsSnapshotList<false>, catch500);
        const sendItem = Function.compose(client.SocialSendItem<false>, catch500);
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

const AuthProxyApiLive = HttpApiBuilder.api(ApiWithMiddleware).pipe(
    Layer.provide(RaffleLive),
    Layer.provide(DeviceManagementLive),
    Layer.provide(SyncManagementLive),
    Layer.provide(SocialGroupLive),
    Layer.provide(AuthorizationLive),
    Layer.provide(Client.Default)
);

const HttpAppMiddleware = HttpMiddleware.make((httpApp) =>
    Effect.gen(function* () {
        const auth = yield* NimblebitAuth.NimblebitAuth;
        const request = yield* HttpServerRequest.HttpServerRequest;

        const lastSlashIndex = String.lastIndexOf("/")(request.url);
        if (Option.isNone(lastSlashIndex)) {
            return yield* httpApp;
        }

        const encodedHash = request.url.substring(lastSlashIndex.value + 1);
        const urlExcludingHash = request.url.substring(0, lastSlashIndex.value + 1);
        const decodedHash = Schema.decodeOption(Schema.StringFromBase64Url)(encodedHash);
        if (Option.isNone(decodedHash)) {
            return yield* httpApp;
        }

        const signedHash = yield* Effect.either(auth.sign(decodedHash.value));
        if (Either.isLeft(signedHash)) {
            return yield* httpApp;
        }

        return yield* Effect.provideService(
            httpApp,
            HttpServerRequest.HttpServerRequest,
            request.modify({ url: urlExcludingHash + signedHash.right })
        );
    })
);

const ServerLive = HttpApiBuilder.serve(Function.flow(HttpMiddleware.logger, HttpAppMiddleware)).pipe(
    HttpServer.withLogAddress,
    Layer.provide(AuthProxyApiLive),
    Layer.provide(NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig)),
    Layer.provide(
        NodeHttpServer.layerConfig(http.createServer, {
            port: Config.orElse(Config.number("PORT"), () => Config.succeed(3000)),
        })
    ),
    Layer.provide(PlatformConfigProvider.layerDotEnvAdd(".env")),
    Layer.provide(NodeContext.layer)
);

Layer.launch(ServerLive).pipe(NodeRuntime.runMain);

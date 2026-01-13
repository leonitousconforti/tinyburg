import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import * as HttpApiSecurity from "@effect/platform/HttpApiSecurity";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as http from "node:http";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

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
                yield* Effect.log("checking bearer token", Redacted.value(bearerToken));
                return yield* new HttpApiError.Unauthorized();
            }),
        };
    })
);

class Client extends Effect.Service<Client>()("Client", {
    accessors: false,
    dependencies: [FetchHttpClient.layer],
    effect: HttpApiClient.make(TinyTower.Api, { baseUrl: "https://sync.nimblebit.com" }),
}) {}

const ApiWithMiddleware = TinyTower.Api.middleware(Authorization);

const RaffleLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "RaffleGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Client;
        const auth = yield* NimblebitAuth.NimblebitAuth;

        const passThough = <T extends { hash: string }>(input: T): { path: T } => ({
            path: { ...input, hash: input.hash.slice(-36) + auth.authKey },
        });

        return handlers
            .handle("RaffleEnter", ({ path }) => Effect.orDie(client.RaffleGroup.RaffleEnter(passThough(path))))
            .handle("RaffleEnterMulti", ({ path }) =>
                Effect.orDie(client.RaffleGroup.RaffleEnterMulti(passThough(path)))
            )
            .handle("RaffleCheckEnteredCurrent", ({ path }) =>
                Effect.orDie(client.RaffleGroup.RaffleCheckEnteredCurrent(passThough(path)))
            );
    })
);

const DeviceManagementLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Client;
        const auth = yield* NimblebitAuth.NimblebitAuth;

        const passThough = <T extends { hash: string }>(input: T): { path: T } => ({
            path: { ...input, hash: input.hash.slice(-36) + auth.authKey },
        });

        return handlers
            .handle("DeviceNewPlayer", () => new HttpApiError.InternalServerError())
            .handle("DeviceVerifyDevice", ({ path }) =>
                Effect.orDie(client.DeviceManagementGroup.DeviceVerifyDevice({ path }))
            )
            .handle("DevicePlayerDetails", ({ path }) =>
                Effect.orDie(client.DeviceManagementGroup.DevicePlayerDetails(passThough(path)))
            )
            .handle("DeviceRegisterEmail", ({ path, payload }) =>
                Effect.orDie(client.DeviceManagementGroup.DeviceRegisterEmail({ ...passThough(path), payload }))
            );
    })
);

const SyncManagementLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("SyncCheckForNewerSave", () => new HttpApiError.InternalServerError())
            .handle("SyncPullSave", () => new HttpApiError.InternalServerError())
            .handle("SyncPullSnapshot", () => new HttpApiError.InternalServerError())
            .handle("SyncPushSave", () => new HttpApiError.InternalServerError())
            .handle("SyncPushSnapshot", () => new HttpApiError.InternalServerError())
            .handle("SyncRetrieveSnapshotList", () => new HttpApiError.InternalServerError());
    })
);

const SocialGroupLive = HttpApiBuilder.group(
    ApiWithMiddleware,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("SocialGetGifts", () => new HttpApiError.InternalServerError())
            .handle("SocialPullFriendTower", () => new HttpApiError.InternalServerError())
            .handle("SocialGetVisits", () => new HttpApiError.InternalServerError())
            .handle("SocialPullFriendMeta", () => new HttpApiError.InternalServerError())
            .handle("SocialReceiveGift", () => new HttpApiError.InternalServerError())
            .handle("SocialRetrieveFriendsSnapshotList", () => new HttpApiError.InternalServerError())
            .handle("SocialSendItem", () => new HttpApiError.InternalServerError());
    })
);

const AuthProxyApiLive = HttpApiBuilder.api(ApiWithMiddleware).pipe(
    Layer.provide(RaffleLive),
    Layer.provide(DeviceManagementLive),
    Layer.provide(SyncManagementLive),
    Layer.provide(SocialGroupLive),
    Layer.provide(AuthorizationLive),
    Layer.provide(Client.Default),
    Layer.provide(NimblebitAuth.layerNodeDirectConfig(NimblebitConfig.NimblebitAuthKeyConfig))
);

const ServerLive = HttpApiBuilder.serve().pipe(
    Layer.provide(AuthProxyApiLive),
    Layer.provide(
        NodeHttpServer.layerConfig(http.createServer, {
            port: Config.orElse(Config.number("PORT"), () => Config.succeed(3000)),
        })
    )
);

Layer.launch(ServerLive).pipe(NodeRuntime.runMain);

import type { HttpClientError } from "effect/unstable/http";

import { Config, Context, Effect, Function, Layer, type Schema } from "effect";
import { HttpApiBuilder, HttpApiClient, HttpApiError } from "effect/unstable/httpapi";

import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Endpoints } from "@tinyburg/disco-zoo-sdk";

import { AuthProxyApiDecodeHash, AuthProxyApiDecodeHashLive } from "../middleware/20_tinytowerDecode.ts";

/** @internal */
class Client extends Context.Service<Client>()("DiscoZooClient", {
    make: HttpApiClient.make(Endpoints.Api, { baseUrl: "https://sync.nimblebit.com" }),
}) {
    static readonly Default = Layer.effect(Client, Client.make);
}

/** @internal */
const catch500s = <A, E, R>(
    effect: Effect.Effect<A, E | Schema.SchemaError | HttpClientError.HttpClientError, R>
) =>
    effect.pipe(
        Effect.catchTag("SchemaError", () => new HttpApiError.InternalServerError()),
        Effect.catchTag("HttpClientError", () => new HttpApiError.InternalServerError())
    );

/**
 * NOTE: the `Authorization` (bearer + scope) middleware is intentionally not
 * applied yet - these endpoints carry no `OIDCScopes`, and `Authorization`
 * forbids any endpoint that carries none. Add `.middleware(Authorization)`
 * (and `AuthorizationLive` below) once the endpoints are annotated with scopes.
 *
 * @internal
 */
const Api = Endpoints.Api.middleware(AuthProxyApiDecodeHash);

/**
 * @since 1.0.0
 * @category Disco Zoo Routes
 */
export const DiscoZooDeviceManagementLive = HttpApiBuilder.group(
    Api,
    "DeviceManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.DeviceManagementGroup);
        return handlers
            .handle("DeviceNewPlayer", () => Effect.fail(new HttpApiError.Forbidden()))
            .handle("DevicePlayerDetails", Function.compose(client.DevicePlayerDetails, catch500s))
            .handle("DeviceVerifyDevice", Function.compose(client.DeviceVerifyDevice, catch500s));
    })
);

/**
 * @since 1.0.0
 * @category Disco Zoo Routes
 */
export const DiscoZooSyncManagementLive = HttpApiBuilder.group(
    Api,
    "SyncManagementGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SyncManagementGroup);
        return handlers
            .handle("SyncPullSave", Function.compose(client.SyncPullSave, catch500s))
            .handle("SyncCheckForNewerSave", Function.compose(client.SyncCheckForNewerSave, catch500s));
    })
);

/**
 * @since 1.0.0
 * @category Disco Zoo Routes
 */
export const DiscoZooSocialLive = HttpApiBuilder.group(
    Api,
    "SocialGroup",
    Effect.fnUntraced(function* (handlers) {
        const client = yield* Effect.map(Client, (client) => client.SocialGroup);
        return handlers
            .handle("SocialGetItems", Function.compose(client.SocialGetItems, catch500s))
            .handle("SocialGetVisits", Function.compose(client.SocialGetVisits, catch500s))
            .handle("SocialReceiveItem", Function.compose(client.SocialReceiveItem, catch500s))
            .handle("SocialSendItem", Function.compose(client.SocialSendItem, catch500s))
            .handle("SocialPullFriendGame", Function.compose(client.SocialPullFriendGame, catch500s))
            .handle("SocialPullFriendMeta", Function.compose(client.SocialPullFriendMeta, catch500s));
    })
);

/**
 * @since 1.0.0
 * @category Disco Zoo Routes
 */
export const DiscoZooApiLive = HttpApiBuilder.layer(Api).pipe(
    Layer.provide([DiscoZooDeviceManagementLive, DiscoZooSyncManagementLive, DiscoZooSocialLive]),
    Layer.provide(AuthProxyApiDecodeHashLive),
    Layer.provide(
        NimblebitAuth.layerDirectConfig(
            Config.schema(NimblebitConfig.NimblebitAuthKeySchema, "DISCOZOO_NIMBLEBIT_AUTH_KEY")
        )
    ),
    Layer.provide(Client.Default)
);

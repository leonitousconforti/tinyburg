/**
 * Authentication providers for connecting to Nimblebit's servers.
 *
 * @since 1.0.0
 * @category Auth
 */

import type * as Array from "effect/Array";
import type * as PlatformError from "effect/PlatformError";

import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Random from "effect/Random";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import * as NimblebitConfig from "./NimblebitConfig.ts";

/**
 * @since 1.0.0
 * @category Auth
 */
export class NimblebitAuth extends Context.Service<
    NimblebitAuth,
    (
        | {
              readonly host: "https://sync.nimblebit.com";
              readonly authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>;
          }
        | {
              readonly host: "https://authproxy.tinyburg.app";
              readonly authKey: Redacted.Redacted<string>;
          }
        | {
              readonly host: string;
              readonly authKey: Redacted.Redacted<string>;
          }
    ) & {
        readonly sign: (data: string) => Effect.Effect<string, Schema.SchemaError, never>;
        readonly salt: Effect.Effect<number, PlatformError.PlatformError, never>;
        readonly burnbot: Effect.Effect<
            Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>,
            never,
            never
        >;
    }
>()("NimblebitAuth") {
    private static readonly burnbots: Array.NonEmptyReadonlyArray<
        Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>
    > = [
        {
            playerId: NimblebitConfig.PlayerIdSchema.make("BPQSY"),
            playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                Redacted.make("8dad81ae-2626-41b9-8225-325f4809057f")
            ),
        },
        {
            playerId: NimblebitConfig.PlayerIdSchema.make("9GV59"),
            playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                Redacted.make("be61b26e-330b-41e0-ad2f-48eb79dc3bd6")
            ),
        },
        {
            playerId: NimblebitConfig.PlayerIdSchema.make("9GV2Y"),
            playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                Redacted.make("efe5f6a3-8cd5-4956-897c-ec1db6c26485")
            ),
        },
        {
            playerId: NimblebitConfig.PlayerIdSchema.make("9GTYN"),
            playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                Redacted.make("89f9b90b-4e1e-4b48-af56-df39da7b17a7")
            ),
        },
    ] as const;

    private static readonly Salt: Effect.Effect<number, PlatformError.PlatformError, Crypto.Crypto> = Effect.map(
        Crypto.Crypto.use((crypto) => crypto.randomBytes(4)),
        (bytes) => new DataView(bytes.buffer).getUint32(0, false)
    );

    private static readonly MD5 = (data: string): Effect.Effect<string, never, never> =>
        Effect.map(
            Effect.promise(() => import("node:crypto")),
            (crypto) => crypto.createHash("md5").update(data).digest("hex")
        );

    public static readonly Direct = (
        authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
    ): Layer.Layer<NimblebitAuth, never, Crypto.Crypto> =>
        Effect.flatMap(
            Crypto.Crypto,
            Effect.fnUntraced(function* (crypto) {
                const randomBurnBot = yield* Random.shuffle(NimblebitAuth.burnbots);
                return {
                    sign: (data: string) => NimblebitAuth.MD5(data + Redacted.value(authKey)),
                    salt: NimblebitAuth.Salt.pipe(Effect.provideService(Crypto.Crypto, crypto)),
                    burnbot: Effect.sync(() => randomBurnBot[0]),
                    host: "https://sync.nimblebit.com",
                    authKey,
                };
            })
        ).pipe(Layer.effect(this));

    public static readonly DirectConfig = (
        config: Config.Config<
            Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
        > = NimblebitConfig.NimblebitAuthKeyConfig
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> =>
        Effect.map(config, (authKey) => NimblebitAuth.Direct(authKey)).pipe(Layer.unwrap);

    public static readonly CustomHost = ({
        authKey,
        host,
    }: {
        host: string;
        authKey: Redacted.Redacted<string>;
    }): Layer.Layer<NimblebitAuth, never, Crypto.Crypto> =>
        Effect.flatMap(
            Crypto.Crypto,
            Effect.fnUntraced(function* (crypto) {
                const randomBurnBot = yield* Random.shuffle(NimblebitAuth.burnbots);
                return {
                    salt: NimblebitAuth.Salt.pipe(Effect.provideService(Crypto.Crypto, crypto)),
                    sign: Schema.encodeEffect(Schema.StringFromBase64Url),
                    burnbot: Effect.sync(() => randomBurnBot[0]),
                    authKey,
                    host,
                };
            })
        ).pipe(Layer.effect(this));

    public static readonly CustomHostConfig = (
        options: Config.Wrap<{
            host: string;
            authKey: Redacted.Redacted<string>;
        }>
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> =>
        Layer.unwrap(Effect.map(Config.unwrap(options), NimblebitAuth.CustomHost));

    public static readonly TinyburgAuthProxy = ({
        authKey,
    }: {
        authKey: Redacted.Redacted<string>;
    }): Layer.Layer<NimblebitAuth, never, Crypto.Crypto> =>
        NimblebitAuth.CustomHost({ host: "https://authproxy.tinyburg.app", authKey });

    public static readonly TinyburgAuthProxyConfig = (
        options: Config.Wrap<{
            authKey: Redacted.Redacted<string>;
        }>
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> =>
        Layer.unwrap(Effect.map(Config.unwrap(options), NimblebitAuth.TinyburgAuthProxy));
}

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerDirect: (
    authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto> = NimblebitAuth.Direct;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerDirectConfig: (
    config?: Config.Config<Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>> | undefined
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> = NimblebitAuth.DirectConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerCustomHost: (options: {
    host: string;
    authKey: Redacted.Redacted<string>;
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto> = NimblebitAuth.CustomHost;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerCustomHostConfig: (
    options: Config.Wrap<{
        host: string;
        authKey: Redacted.Redacted<string>;
    }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> = NimblebitAuth.CustomHostConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerTinyburgAuthProxy: (options: {
    authKey: Redacted.Redacted<string>;
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto> = NimblebitAuth.TinyburgAuthProxy;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerTinyburgAuthProxyConfig: (
    options: Config.Wrap<{
        authKey: Redacted.Redacted<string>;
    }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto> = NimblebitAuth.TinyburgAuthProxyConfig;

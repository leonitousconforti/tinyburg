/**
 * Authentication providers for connecting to Nimblebit's servers.
 *
 * @since 1.0.0
 * @category Auth
 */

import type * as Array from "effect/Array";

import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Digest from "effect/crypto/Digest";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Random from "effect/Random";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import type { NimblebitGame } from "./NimblebitGame.ts";

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
              readonly authKey: Redacted.Redacted;
          }
        | {
              readonly host: string;
              readonly authKey: Redacted.Redacted;
          }
    ) & {
        readonly sign: (data: string) => Effect.Effect<string, Schema.SchemaError>;
        readonly salt: Effect.Effect<number>;
        readonly burnbot: (
            game: NimblebitGame
        ) => Effect.Effect<Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>, never, never>;
    }
>()("NimblebitAuth") {
    /**
     * Throwaway players per game, for requests that need a player but not any
     * particular one. Games without any yet have an empty pool, and asking for
     * one of those dies rather than handing back `undefined`.
     */
    private static readonly burnBots: Record<
        NimblebitGame,
        Array.NonEmptyReadonlyArray<Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>>
    > = {
        bitcity: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("C9N13"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("9c7d1d07-4b0d-4906-b8f9-80796d9aad24")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("C9N14"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("85601533-5cd4-4810-90a1-54fcdbc55ba6")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("C9N15"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("1d647bbc-640d-4b8f-8f7a-8a1e1fa89821")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("C9N16"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("db77c437-b69d-4979-a373-ee73a8ac5e63")
                ),
            },
        ],
        discozoo: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1V9KS"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("720bc327-dc6b-4a1c-b878-3df782432142")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1V9KT"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("505b39fa-57c3-4222-98b3-aa13f710bf28")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1V9KV"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("7fbeabd1-0e80-4f72-ab46-1c103c42c6f2")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1V9KW"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("f9af9f88-3f41-44d4-93d9-ae6499a023ca")
                ),
            },
        ],
        legotower: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1RGQZ5"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("1838c384-3651-44da-98ab-a651b3d17e44")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1RGQZ6"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("6c35bd69-7508-4dfe-adbd-797a9b1a7b48")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1RGQZ7"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("cc2c980f-c683-45d8-bf9e-48fdc2d09c4f")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("1RGQZ8"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("d0f53327-f068-492d-8453-843d08e4cdbd")
                ),
            },
        ],
        pocketplanes: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("4F1CY"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("cd8c1eff-f195-4743-aa05-15c14946ddf6")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("4F1CZ"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("f16e6c42-e1e6-4a3e-8846-21283b6404b5")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("4F1D0"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("951819df-4a9c-4901-902e-da938df0792e")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("4F1D1"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("41a92541-3f7d-4f04-84ff-96659ed95ca4")
                ),
            },
        ],
        pockettrains: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("6TM3M"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("e3f7c9ff-80f3-4842-bc00-954b14a37d4f")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("6TM3N"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("97f5f289-f389-4c67-8b6d-ab48dbe16424")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("6TM3P"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("8e42e443-1e22-4d57-8026-0c22ea7c9191")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("6TM3Q"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("746c8015-f013-4e54-a356-8bde58ba4b3f")
                ),
            },
        ],
        tinytower: [
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
        ],
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        tinytowerclassic: [] as unknown as Array.NonEmptyReadonlyArray<
            Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>
        >,
        tinytowervegas: [
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("707P8"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("83df5ac8-3d3c-46b0-9623-7c99211ac96e")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("707P9"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("11eec373-3b65-4c5b-97ed-9d33a9c20eca")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("707PB"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("26c9380c-c1e9-4409-b367-d3d2ca982a92")
                ),
            },
            {
                playerId: NimblebitConfig.PlayerIdSchema.make("707PC"),
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema.make(
                    Redacted.make("fd66fe7d-a6a0-4178-8dea-a2402ecf501a")
                ),
            },
        ],
    };

    private static readonly burnbot: (
        game: NimblebitGame
    ) => Effect.Effect<Schema.Schema.Type<typeof NimblebitConfig.AuthenticatedPlayerSchema>, never, never> = (game) =>
        Random.choice(NimblebitAuth.burnBots[game]);

    /** A random signed int32, like the salts the games send. */
    private static readonly Salt = (random: SecureRandom.SecureRandom["Service"]): Effect.Effect<number> =>
        random.intBetween(-0x8000_0000, 0x7fff_ffff);

    public static readonly Direct = (
        authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
    ): Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom | Digest.Digest> =>
        Layer.effect(
            NimblebitAuth,
            Effect.gen(function* () {
                const random = yield* SecureRandom.SecureRandom;
                const digest = yield* Digest.Digest;
                const encoder = new TextEncoder();
                return {
                    host: "https://sync.nimblebit.com",
                    authKey,
                    salt: NimblebitAuth.Salt(random),
                    sign: (data: string) =>
                        digest.digestHex(Digest.md5, encoder.encode(data + Redacted.value(authKey))),
                    burnbot: NimblebitAuth.burnbot,
                };
            })
        );

    public static readonly DirectConfig = (
        config: Config.Config<
            Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
        > = NimblebitConfig.NimblebitAuthKeyConfig
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom | Digest.Digest> =>
        Effect.map(config, (authKey) => NimblebitAuth.Direct(authKey)).pipe(Layer.unwrap);

    public static readonly CustomHost = ({
        authKey,
        host,
    }: {
        host: string;
        authKey: Redacted.Redacted;
    }): Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom> =>
        Layer.effect(
            NimblebitAuth,
            Effect.map(SecureRandom.SecureRandom, (random) => ({
                host,
                authKey,
                salt: NimblebitAuth.Salt(random),
                sign: Schema.encodeEffect(Schema.StringFromBase64Url),
                burnbot: NimblebitAuth.burnbot,
            }))
        );

    public static readonly CustomHostConfig = (
        options: Config.Wrap<{
            host: string;
            authKey: Redacted.Redacted;
        }>
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom> =>
        Layer.unwrap(Effect.map(Config.unwrap(options), NimblebitAuth.CustomHost));

    public static readonly TinyburgAuthProxy = ({
        authKey,
    }: {
        authKey: Redacted.Redacted;
    }): Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom> =>
        NimblebitAuth.CustomHost({ host: "https://authproxy.tinyburg.app", authKey });

    public static readonly TinyburgAuthProxyConfig = (
        options: Config.Wrap<{
            authKey: Redacted.Redacted;
        }>
    ): Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom> =>
        Layer.unwrap(Effect.map(Config.unwrap(options), NimblebitAuth.TinyburgAuthProxy));
}

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerDirect: (
    authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom | Digest.Digest> = NimblebitAuth.Direct;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerDirectConfig: (
    config?: Config.Config<Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom | Digest.Digest> =
    NimblebitAuth.DirectConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerCustomHost: (options: {
    host: string;
    authKey: Redacted.Redacted;
}) => Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom> = NimblebitAuth.CustomHost;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerCustomHostConfig: (
    options: Config.Wrap<{
        host: string;
        authKey: Redacted.Redacted;
    }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom> = NimblebitAuth.CustomHostConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerTinyburgAuthProxy: (options: {
    authKey: Redacted.Redacted;
}) => Layer.Layer<NimblebitAuth, never, SecureRandom.SecureRandom> = NimblebitAuth.TinyburgAuthProxy;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerTinyburgAuthProxyConfig: (
    options: Config.Wrap<{
        authKey: Redacted.Redacted;
    }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, SecureRandom.SecureRandom> = NimblebitAuth.TinyburgAuthProxyConfig;

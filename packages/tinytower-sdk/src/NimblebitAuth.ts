/**
 * Authentication providers for connecting to Nimblebit's servers.
 *
 * @since 1.0.0
 * @category Auth
 */

import type * as Config from "effect/Config";
import type * as ConfigError from "effect/ConfigError";
import type * as Schema from "effect/Schema";

import * as EffectSchemas from "effect-schemas";
import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import * as NimblebitConfig from "./NimblebitConfig.ts";

/**
 * @since 1.0.0
 * @category Auth
 */
export class NimblebitAuth extends Context.Tag("NimblebitAuth")<
    NimblebitAuth,
    (
        | {
              readonly host: "https://sync.nimblebit.com";
              readonly authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>;
          }
        | {
              readonly host: "https://authproxy.tinyburg.app";
              readonly authKey: Redacted.Redacted<string>;
          }
    ) & {
        readonly sign: (data: string) => Effect.Effect<string, never, never>;
        readonly salt: Effect.Effect<Schema.Schema.Type<EffectSchemas.Number.U32>, never, never>;
        readonly burnbot: Effect.Effect<Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>, never, never>;
    }
>() {
    private static readonly burnbots: Array.NonEmptyReadonlyArray<
        Schema.Schema.Type<NimblebitConfig.AuthenticatedPlayerSchema>
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

    private static readonly NodeSalt: Effect.Effect<Schema.Schema.Type<EffectSchemas.Number.U32>, never, never> =
        Effect.map(
            Effect.promise(() => import("node:crypto")),
            (crypto) => EffectSchemas.Number.U32.make(crypto.randomBytes(4).readUInt32BE(0))
        );

    private static readonly WebSalt: Effect.Effect<Schema.Schema.Type<EffectSchemas.Number.U32>, never, never> =
        Effect.sync(() => {
            const array = new Uint8Array(4);
            crypto.getRandomValues(array);
            const salt = new DataView(array.buffer).getUint32(0, false);
            return EffectSchemas.Number.U32.make(salt);
        });

    private static readonly NodeMD5 = (data: string): Effect.Effect<string, never, never> =>
        Effect.map(
            Effect.promise(() => import("node:crypto")),
            (crypto) => crypto.createHash("md5").update(data).digest("hex")
        );

    private static readonly WebMD5 = (data: string): Effect.Effect<string, never, never> =>
        Effect.promise(async () => {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest("MD5", encoded);
            const hashArray = Array.fromIterable(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        });

    public static readonly NodeDirect = ({
        authKey,
    }: {
        authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>;
    }): Layer.Layer<NimblebitAuth, never, never> =>
        Layer.succeed(this, {
            authKey,
            host: "https://sync.nimblebit.com",
            salt: NimblebitAuth.NodeSalt,
            burnbot: Effect.sync(() => this.burnbots[0]),
            sign: (data: string) => NimblebitAuth.NodeMD5(data + Redacted.value(authKey)),
        });

    public static readonly WebDirect = ({
        authKey,
    }: {
        authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>;
    }): Layer.Layer<NimblebitAuth, never, never> =>
        Layer.succeed(this, {
            authKey,
            host: "https://sync.nimblebit.com" as const,
            salt: NimblebitAuth.WebSalt,
            burnbot: Effect.sync(() => this.burnbots[0]),
            sign: (data: string) => NimblebitAuth.WebMD5(data + Redacted.value(authKey)),
        });

    public static readonly NodeDirectConfig = (
        config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
    ): Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never> =>
        Effect.map(config, (authKey) => NimblebitAuth.NodeDirect({ authKey })).pipe(Layer.unwrapEffect);

    public static readonly WebDirectConfig = (
        config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
    ): Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never> =>
        Effect.map(config, (authKey) => NimblebitAuth.WebDirect({ authKey })).pipe(Layer.unwrapEffect);

    public static readonly NodeTinyburgAuthProxy = ({
        authKey,
    }: {
        authKey: Redacted.Redacted<string>;
    }): Layer.Layer<NimblebitAuth, never, never> =>
        Layer.succeed(this, {
            authKey,
            host: "https://authproxy.tinyburg.app" as const,
            salt: NimblebitAuth.NodeSalt,
            burnbot: Effect.sync(() => this.burnbots[0]),
            sign: (data: string) => Effect.succeed(data + Redacted.value(authKey)),
        });

    public static readonly WebTinyburgAuthProxy = ({
        authKey,
    }: {
        authKey: Redacted.Redacted<string>;
    }): Layer.Layer<NimblebitAuth, never, never> =>
        Layer.succeed(this, {
            authKey,
            host: "https://authproxy.tinyburg.app" as const,
            salt: NimblebitAuth.WebSalt,
            burnbot: Effect.sync(() => this.burnbots[0]),
            sign: (data: string) => Effect.succeed(data + Redacted.value(authKey)),
        });
}

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerNodeDirect: ({
    authKey,
}: {
    authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>;
}) => Layer.Layer<NimblebitAuth, never, never> = NimblebitAuth.NodeDirect;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerWebDirect: ({
    authKey,
}: {
    authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>;
}) => Layer.Layer<NimblebitAuth, never, never> = NimblebitAuth.WebDirect;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerNodeDirectConfig: (
    config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never> = NimblebitAuth.NodeDirectConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerWebDirectConfig: (
    config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never> = NimblebitAuth.WebDirectConfig;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerNodeTinyburgAuthProxy: ({
    authKey,
}: {
    authKey: Redacted.Redacted<string>;
}) => Layer.Layer<NimblebitAuth, never, never> = NimblebitAuth.NodeTinyburgAuthProxy;

/**
 * @since 1.0.0
 * @category Layer
 */
export const layerWebTinyburgAuthProxy: ({
    authKey,
}: {
    authKey: Redacted.Redacted<string>;
}) => Layer.Layer<NimblebitAuth, never, never> = NimblebitAuth.WebTinyburgAuthProxy;

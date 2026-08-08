/**
 * Configuration and schemas for authenticating with Nimblebit's cloud sync
 * service.
 *
 * @since 1.0.0
 * @category Config
 */

import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";

/**
 * @since 1.0.0
 * @category Schema
 */
export const PlayerIdSchema = Schema.String.pipe(
    Schema.check(Schema.isMinLength(1)),
    Schema.check(Schema.isMaxLength(5)),
    Schema.check(Schema.isPattern(/^([\dA-Z]*)$/)),
    Schema.brand("PlayerId")
);

/**
 * @since 1.0.0
 * @category Schema
 */
export const PlayerEmailSchema = Schema.String.pipe(Schema.RedactedFromValue, Schema.brand("PlayerEmail"));

/**
 * @since 1.0.0
 * @category Schema
 */
export const PlayerAuthKeySchema = Schema.String.pipe(
    Schema.check(Schema.isUUID()),
    Schema.RedactedFromValue,
    Schema.brand("PlayerAuthKey")
);

/**
 * @since 1.0.0
 * @category Schema
 */
export const UnauthenticatedPlayerSchema = Schema.Struct({
    playerId: PlayerIdSchema.pipe(Schema.optional),
    playerEmail: PlayerEmailSchema,
});

/**
 * @since 1.0.0
 * @category Schema
 */
export const AuthenticatedPlayerSchema = Schema.Struct({
    playerAuthKey: PlayerAuthKeySchema,
    playerId: PlayerIdSchema,
});

/**
 * @since 1.0.0
 * @category Schema
 */
export const NimblebitAuthKeySchema = Schema.String.pipe(Schema.RedactedFromValue, Schema.brand("NimblebitAuthKey"));

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerIdConfig: Config.Config<Schema.Schema.Type<typeof PlayerIdSchema>> = Config.schema(
    PlayerIdSchema,
    "PLAYER_ID"
);

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerEmailConfig: Config.Config<Schema.Schema.Type<typeof PlayerEmailSchema>> = Config.schema(
    PlayerEmailSchema,
    "PLAYER_EMAIL"
);

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerAuthKeyConfig: Config.Config<Schema.Schema.Type<typeof PlayerAuthKeySchema>> = Config.schema(
    PlayerAuthKeySchema,
    "PLAYER_AUTH_KEY"
);

/**
 * @since 1.0.0
 * @category Config
 */
export const UnauthenticatedPlayerConfig: Config.Config<Schema.Schema.Type<typeof UnauthenticatedPlayerSchema>> =
    Config.all({
        playerId: PlayerIdConfig.pipe(Config.orElse(() => Config.succeed(undefined))),
        playerEmail: PlayerEmailConfig,
    });

/**
 * @since 1.0.0
 * @category Config
 */
export const AuthenticatedPlayerConfig: Config.Config<Schema.Schema.Type<typeof AuthenticatedPlayerSchema>> =
    Config.all({
        playerAuthKey: PlayerAuthKeyConfig,
        playerId: PlayerIdConfig,
    });

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerConfig: Config.Config<
    Schema.Schema.Type<typeof UnauthenticatedPlayerSchema> | Schema.Schema.Type<typeof AuthenticatedPlayerSchema>
> = Config.mapOrFail(
    Config.all({
        playerId: PlayerIdConfig,
        playerEmail: PlayerEmailConfig.pipe(Config.option),
        playerAuthKey: PlayerAuthKeyConfig.pipe(Config.option),
    }),
    ({
        playerAuthKey,
        playerEmail,
        playerId,
    }): Effect.Effect<
        | {
              playerId: Schema.Schema.Type<typeof PlayerIdSchema>;
              playerEmail: Schema.Schema.Type<typeof PlayerEmailSchema>;
          }
        | {
              playerId: Schema.Schema.Type<typeof PlayerIdSchema>;
              playerAuthKey: Schema.Schema.Type<typeof PlayerAuthKeySchema>;
          },
        Config.ConfigError
    > => {
        // Have email
        if (Option.isSome(playerEmail) && Option.isNone(playerAuthKey)) {
            return Effect.succeed({ playerId, playerEmail: playerEmail.value });
        }

        // Have player salt
        if (Option.isSome(playerAuthKey) && Option.isNone(playerEmail)) {
            return Effect.succeed({ playerId, playerAuthKey: playerAuthKey.value });
        }

        // Cannot have both email and player salt or neither
        return Effect.fail(
            new Config.ConfigError(
                new Schema.SchemaError(
                    new SchemaIssue.InvalidValue({
                        message: "Either email or player salt must be provided, not both.",
                    })
                )
            )
        );
    }
);

/**
 * @since 1.0.0
 * @category Config
 */
export const NimblebitAuthKeyConfig: Config.Config<Schema.Schema.Type<typeof NimblebitAuthKeySchema>> = Config.schema(
    NimblebitAuthKeySchema,
    "NIMBLEBIT_AUTH_KEY"
);

/**
 * Configuration and schemas for authenticating with Nimblebit's cloud sync
 * service.
 *
 * @since 1.0.0
 * @category Config
 */

import * as Config from "effect/Config";
import * as ConfigError from "effect/ConfigError";
import * as Either from "effect/Either";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/**
 * @since 1.0.0
 * @category Schema
 */
export class PlayerIdSchema extends Function.pipe(
    Schema.String,
    Schema.length(5),
    Schema.pattern(/^([\dA-Z]*)$/gm),
    Schema.brand("PlayerId")
) {}

/**
 * @since 1.0.0
 * @category Schema
 */
export class PlayerEmailSchema extends Function.pipe(Schema.String, Schema.Redacted, Schema.brand("PlayerEmail")) {}

/**
 * @since 1.0.0
 * @category Schema
 */
export class PlayerAuthKeySchema extends Function.pipe(Schema.UUID, Schema.Redacted, Schema.brand("PlayerAuthKey")) {}

/**
 * @since 1.0.0
 * @category Schema
 */
export class UnauthenticatedPlayerSchema extends Schema.Struct({
    playerEmail: PlayerEmailSchema,
    playerId: Schema.optionalWith(PlayerIdSchema, { nullable: true }),
}) {}

/**
 * @since 1.0.0
 * @category Schema
 */
export class AuthenticatedPlayerSchema extends Schema.Struct({
    playerId: PlayerIdSchema,
    playerAuthKey: PlayerAuthKeySchema,
}) {}

/**
 * @since 1.0.0
 * @category Schema
 */
export class NimblebitAuthKeySchema extends Function.pipe(
    Schema.String,
    Schema.Redacted,
    Schema.brand("NimblebitAuthKey")
) {}

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerIdConfig: Config.Config<Schema.Schema.Type<PlayerIdSchema>> = Schema.Config(
    "PLAYER_ID",
    PlayerIdSchema
).pipe(Config.withDescription("The player id of your cloud sync account."));

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerEmailConfig: Config.Config<Schema.Schema.Type<PlayerEmailSchema>> = Schema.Config(
    "PLAYER_EMAIL",
    PlayerEmailSchema
).pipe(Config.withDescription("The email address of your cloud sync account."));

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerAuthKeyConfig: Config.Config<Schema.Schema.Type<PlayerAuthKeySchema>> = Schema.Config(
    "PLAYER_AUTH_KEY",
    PlayerAuthKeySchema
).pipe(Config.withDescription("The player auth key of your cloud sync account."));

/**
 * @since 1.0.0
 * @category Config
 */
export const UnauthenticatedPlayerConfig: Config.Config<Schema.Schema.Type<UnauthenticatedPlayerSchema>> = Config.all({
    playerEmail: PlayerEmailConfig,
    playerId: PlayerIdConfig.pipe(Config.orElse(() => Config.succeed(undefined))),
});

/**
 * @since 1.0.0
 * @category Config
 */
export const AuthenticatedPlayerConfig: Config.Config<Schema.Schema.Type<AuthenticatedPlayerSchema>> = Config.all({
    playerId: PlayerIdConfig,
    playerAuthKey: PlayerAuthKeyConfig,
});

/**
 * @since 1.0.0
 * @category Config
 */
export const PlayerConfig: Config.Config<
    Schema.Schema.Type<UnauthenticatedPlayerSchema> | Schema.Schema.Type<AuthenticatedPlayerSchema>
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
    }): Either.Either<
        | {
              playerId: Schema.Schema.Type<PlayerIdSchema>;
              playerEmail: Schema.Schema.Type<PlayerEmailSchema>;
          }
        | {
              playerId: Schema.Schema.Type<PlayerIdSchema>;
              playerAuthKey: Schema.Schema.Type<PlayerAuthKeySchema>;
          },
        ConfigError.ConfigError
    > => {
        // Have email
        if (Option.isSome(playerEmail) && Option.isNone(playerAuthKey)) {
            return Either.right({ playerId, playerEmail: playerEmail.value });
        }

        // Have player salt
        if (Option.isSome(playerAuthKey) && Option.isNone(playerEmail)) {
            return Either.right({ playerId, playerAuthKey: playerAuthKey.value });
        }

        // Cannot have both email and player salt or neither
        return Either.left(ConfigError.InvalidData([], "Either email or player salt must be provided, not both."));
    }
);

/**
 * @since 1.0.0
 * @category Config
 */
export const NimblebitAuthKeyConfig: Config.Config<Schema.Schema.Type<NimblebitAuthKeySchema>> = Schema.Config(
    "NIMBLEBIT_AUTH_KEY",
    NimblebitAuthKeySchema
);

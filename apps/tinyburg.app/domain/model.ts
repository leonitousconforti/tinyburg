import { Model, SqlClient, SqlSchema } from "@effect/sql";
import { PlayerAuthKeySchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { DateTime, Duration, Effect, Schema } from "effect";

/**
 * @since 1.0.0
 * @category Schemas
 */
export const OAuthProvider = Schema.Literal("google", "discord");

/**
 * A user in the tinyburg.app system.
 *
 * @since 1.0.0
 * @category Models
 */
export class User extends Model.Class<User>("User")({
    id: Model.Generated(Schema.UUID),
    createdAt: Model.DateTimeInsertFromDate,
    lastLoginAt: Model.DateTimeUpdateFromDate,
    displayName: Schema.String,
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, null),
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class OAuthAccount extends Model.Class<OAuthAccount>("OAuthAccount")({
    userId: Schema.UUID,
    provider: OAuthProvider,
    providerAccountId: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class Session extends Model.Class<Session>("Session")({
    id: Model.Generated(Schema.UUID),
    userId: Schema.UUID,
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Model.DateTimeFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class TinyTowerAccount extends Model.Class<TinyTowerAccount>("TinyTowerAccount")({
    id: Model.Generated(Schema.UUID),
    userId: Schema.UUID,
    playerId: PlayerIdSchema,
    playerAuthKey: PlayerAuthKeySchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
    verifiedAt: Model.DateTimeFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class PendingTinyTowerAccount extends Model.Class<PendingTinyTowerAccount>("PendingTinyTowerAccount")({
    id: Model.Generated(Schema.UUID),
    userId: Schema.UUID,
    playerId: PlayerIdSchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Model.Field({ select: Model.DateTimeFromDate }),
}) {}

/**
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Effect.Service<Repository>()("@tinyburg/tinyburg.app/domain/Repository", {
    accessors: true,
    dependencies: [],
    effect: Effect.gen(function* () {
        console.log("here");
        const sql = yield* SqlClient.SqlClient;

        const sessions = yield* Model.makeRepository(Session, {
            idColumn: "id",
            tableName: "sessions",
            spanPrefix: "tinyburg.app.domain.Repository.sessions",
        });

        const _tinytowerAccounts = yield* Model.makeRepository(TinyTowerAccount, {
            idColumn: "id",
            tableName: "tinytower_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.tinytowerAccounts",
        });

        const _pendingTinyTowerAccounts = yield* Model.makeRepository(PendingTinyTowerAccount, {
            idColumn: "id",
            tableName: "pending_tinytower_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.pendingTinyTowerAccounts",
        });

        const deleteSession = sessions.delete;
        const createSession = (
            user: User,
            expiresIn?: Duration.DurationInput | undefined
        ): Effect.Effect<Session, never, never> =>
            Effect.flatMap(DateTime.now, (now) =>
                sessions.insert({
                    userId: user.id,
                    createdAt: undefined,
                    expiresAt: DateTime.addDuration(now, expiresIn ?? Duration.days(30)),
                })
            );

        const findUserBySession = SqlSchema.findOne({
            Result: User,
            Request: Schema.UUID,
            execute: (sessionId) => sql`
                SELECT users.* FROM sessions
                INNER JOIN users ON sessions.user_id = users.id
                WHERE sessions.id = ${sessionId} AND sessions.expires_at > NOW()
            `,
        });

        const upsertUserFromOAuth = SqlSchema.single({
            Result: User,
            Request: Schema.Struct({
                provider: OAuthProvider,
                providerAccountId: Schema.String,
                displayName: Schema.String,
                avatarUrl: Schema.OptionFromNullishOr(Schema.String, null),
            }),
            execute: ({ avatarUrl, displayName, provider, providerAccountId }) => sql`
                WITH lock AS (
                    -- Acquire an advisory lock to prevent race conditions for the same OAuth account
                    SELECT pg_advisory_xact_lock(hashtext(${provider} || ':' || ${providerAccountId}))
                ),
                existing_user AS (
                    -- Try to find the user linked to this oauth account
                    SELECT u.* FROM oauth_accounts oa
                    JOIN users u ON u.id = oa.user_id
                    WHERE oa.provider = ${provider} AND oa.provider_account_id = ${providerAccountId}
                ),
                updated_user AS (
                    -- Update the existing user's profile if found
                    UPDATE users SET
                        display_name = ${displayName},
                        avatar_url = ${avatarUrl},
                        last_login_at = NOW()
                    WHERE id = (SELECT id FROM existing_user)
                    RETURNING *
                ),
                new_user AS (
                    -- Insert a new user only if one wasn't found
                    INSERT INTO users (display_name, avatar_url, last_login_at)
                    SELECT ${displayName}, ${avatarUrl}, NOW()
                    WHERE NOT EXISTS (SELECT 1 FROM existing_user)
                    RETURNING *
                ),
                final_user AS (
                    SELECT * FROM updated_user
                    UNION ALL
                    SELECT * FROM new_user
                ),
                linked_account AS (
                    -- Link the oauth account to the new user (no-op if already linked)
                    INSERT INTO oauth_accounts (provider, provider_account_id, user_id)
                    SELECT ${provider}, ${providerAccountId}, id FROM new_user
                    ON CONFLICT (provider, provider_account_id) DO NOTHING
                )
                SELECT * FROM final_user;
            `,
        });

        return {
            deleteSession,
            createSession,
            findUserBySession,
            upsertUserFromOAuth,
        };
    }),
}) {}

import { DateTime, Duration, Effect, Context, Schema, Layer, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlSchema, SqlModel, type SqlError } from "effect/unstable/sql";

import { PlayerAuthKeySchema, PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

/**
 * @since 1.0.0
 * @category Schemas
 */
export const OAuthProvider = Schema.Literals(["google", "discord"]);

/**
 * A user in the tinyburg.app system.
 *
 * @since 1.0.0
 * @category Models
 */
export class User extends Model.Class<User>("User")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.GeneratedByDb),
    createdAt: Model.DateTimeInsertFromDate,
    lastLoginAt: Model.DateTimeUpdateFromDate,
    displayName: Schema.String,
    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class OAuthAccount extends Model.Class<OAuthAccount>("OAuthAccount")({
    userId: Schema.String.check(Schema.isUUID()),
    provider: OAuthProvider,
    providerAccountId: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class Session extends Model.Class<Session>("Session")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class TinyTowerAccount extends Model.Class<TinyTowerAccount>("TinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerAuthKey: PlayerAuthKeySchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Models
 */
export class PendingTinyTowerAccount extends Model.Class<PendingTinyTowerAccount>("PendingTinyTowerAccount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    userId: Schema.String.check(Schema.isUUID()),
    playerId: PlayerIdSchema,
    playerEmail: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
    expiresAt: Schema.DateTimeUtcFromDate.pipe(Model.GeneratedByDb),
}) {}

/**
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Context.Service<Repository>()("@tinyburg/tinyburg.app/domain/Repository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const sessions = yield* SqlModel.makeRepository(Session, {
            spanPrefix: "tinyburg.app.domain.Repository.sessions",
            tableName: "sessions",
            idColumn: "id",
        });

        const _tinytowerAccounts = yield* SqlModel.makeRepository(TinyTowerAccount, {
            spanPrefix: "tinyburg.app.domain.Repository.tinytowerAccounts",
            tableName: "tinytower_accounts",
            idColumn: "id",
        });

        const _pendingTinyTowerAccounts = yield* SqlModel.makeRepository(PendingTinyTowerAccount, {
            spanPrefix: "tinyburg.app.domain.Repository.pendingTinyTowerAccounts",
            tableName: "pending_tinytower_accounts",
            idColumn: "id",
        });

        const deleteSession = sessions.delete;
        const createSession = (
            user: User,
            expiresIn?: Duration.Input | undefined
        ): Effect.Effect<Session, Schema.SchemaError | SqlError.SqlError, never> =>
            Effect.gen(function* () {
                const now = yield* DateTime.now;
                const newSession = yield* Session.insert.makeEffect({
                    userId: user.id,
                    createdAt: undefined,
                    expiresAt: Model.Override(DateTime.addDuration(now, expiresIn ?? Duration.days(30))),
                });

                return yield* sessions.insert(newSession);
            });

        const findUserBySession = SqlSchema.findOneOption({
            Request: Schema.String.check(Schema.isUUID()),
            Result: Schema.toEncoded(
                Schema.Struct({
                    userId: User.fields.id,
                    userCreatedAt: User.fields.createdAt,
                    userLastLoginAt: User.fields.lastLoginAt,
                    userDisplayName: User.fields.displayName,
                    userAvatarUrl: User.fields.avatarUrl,
                    sessionId: Session.fields.id,
                    sessionUserId: Session.fields.userId,
                    sessionCreatedAt: Session.fields.createdAt,
                    sessionExpiresAt: Session.fields.expiresAt,
                })
            ).pipe(
                Schema.decodeTo(
                    Schema.Struct({
                        user: User,
                        session: Session,
                    }),
                    {
                        encode: SchemaGetter.forbidden(() => "Encoding not supported"),
                        decode: SchemaGetter.transform((output) => ({
                            user: {
                                id: output.userId,
                                createdAt: output.userCreatedAt,
                                lastLoginAt: output.userLastLoginAt,
                                displayName: output.userDisplayName,
                                avatarUrl: output.userAvatarUrl,
                            },
                            session: {
                                id: output.sessionId,
                                userId: output.sessionUserId,
                                createdAt: output.sessionCreatedAt,
                                expiresAt: output.sessionExpiresAt,
                            },
                        })),
                    }
                )
            ),
            execute: (sessionId) => sql`
                SELECT
                    users.id as user_id,
                    users.created_at as user_created_at,
                    users.last_login_at as user_last_login_at,
                    users.display_name as user_display_name,
                    users.avatar_url as user_avatar_url,
                    sessions.id as session_id,
                    sessions.user_id as session_user_id,
                    sessions.created_at as session_created_at,
                    sessions.expires_at as session_expires_at
                FROM sessions
                INNER JOIN users ON sessions.user_id = users.id
                WHERE sessions.id = ${sessionId} AND sessions.expires_at > NOW()
            `,
        });

        const upsertUserFromOAuth = SqlSchema.findOne({
            Result: User,
            Request: Schema.Struct({
                provider: OAuthProvider,
                providerAccountId: Schema.String,
                displayName: Schema.String,
                avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
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
}) {
    static readonly Default = Layer.effect(this, Repository.make);
}

import { Model, SqlClient, SqlSchema } from "@effect/sql";
import { Context, Effect, Option, Schema } from "effect";

/**
 * OAuth provider types supported by the application.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const OAuthProvider = Schema.Literal("google", "discord");

/**
 * The current user in context, provided by middleware/session.
 *
 * @since 1.0.0
 * @category Tags
 */
export class CurrentUser extends Context.Tag("@tinyburg/tinyburg.app/domain/CurrentUser")<CurrentUser, User>() {}

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
    email: Schema.OptionFromNullishOr(Schema.String, null),
}) {}

/**
 * An OAuth account linked to a user.
 *
 * @since 1.0.0
 * @category Models
 */
export class OAuthAccount extends Model.Class<OAuthAccount>("OAuthAccount")({
    id: Model.Generated(Schema.UUID),
    userId: Schema.UUID,
    provider: OAuthProvider,
    providerAccountId: Schema.String,
    createdAt: Model.DateTimeInsertFromDate,
    accessToken: Schema.OptionFromNullishOr(Schema.String, null),
    refreshToken: Schema.OptionFromNullishOr(Schema.String, null),
    expiresAt: Schema.OptionFromNullishOr(Model.DateTimeFromDate, null),
}) {}

/**
 * A session for authenticating users.
 *
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
 * The repository for users, OAuth accounts, and sessions.
 *
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Effect.Service<Repository>()("@tinyburg/tinyburg.app/domain/Repository", {
    accessors: true,
    dependencies: [],
    effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        // User repository
        const users = yield* Model.makeRepository(User, {
            idColumn: "id",
            tableName: "users",
            spanPrefix: "@tinyburg/tinyburg.app/domain/Repository/users",
        });

        // OAuth account repository
        const oauthAccounts = yield* Model.makeRepository(OAuthAccount, {
            idColumn: "id",
            tableName: "oauth_accounts",
            spanPrefix: "@tinyburg/tinyburg.app/domain/Repository/oauthAccounts",
        });

        // Session repository
        const sessions = yield* Model.makeRepository(Session, {
            idColumn: "id",
            tableName: "sessions",
            spanPrefix: "@tinyburg/tinyburg.app/domain/Repository/sessions",
        });

        // Find OAuth account by provider and provider account ID
        const findOAuthAccountByProvider = SqlSchema.findOne({
            Result: OAuthAccount.select,
            Request: Schema.Struct({ provider: OAuthProvider, providerAccountId: Schema.String }),
            execute: ({ provider, providerAccountId }) =>
                sql`SELECT * FROM oauth_accounts WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}`,
        });

        // Find user by OAuth provider info
        const findUserByOAuthProvider = (
            provider: OAuthProvider,
            providerAccountId: string
        ): Effect.Effect<Option.Option<User>> =>
            Effect.gen(function* () {
                const oauthAccount = yield* findOAuthAccountByProvider({ provider, providerAccountId });
                if (Option.isNone(oauthAccount)) {
                    return Option.none();
                }
                return yield* users.findById(oauthAccount.value.userId);
            }).pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

        // Find session by ID and validate it's not expired
        const findValidSession = SqlSchema.findOne({
            Request: Schema.UUID,
            Result: Session.select,
            execute: (sessionId: string) => sql`SELECT * FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()`,
        });

        // Create or update user from OAuth data
        const upsertUserFromOAuth = (data: {
            provider: OAuthProvider;
            providerAccountId: string;
            displayName: string;
            email: Option.Option<string>;
            avatarUrl: Option.Option<string>;
            accessToken: Option.Option<string>;
            refreshToken: Option.Option<string>;
            expiresAt: Option.Option<Date>;
        }): Effect.Effect<User> =>
            Effect.gen(function* () {
                // Check if OAuth account already exists
                const existingOAuth = yield* findOAuthAccountByProvider({
                    provider: data.provider,
                    providerAccountId: data.providerAccountId,
                });

                if (Option.isSome(existingOAuth)) {
                    // Update existing user's last login and return
                    const user = yield* users.findById(existingOAuth.value.userId);
                    if (Option.isSome(user)) {
                        return yield* users.update({
                            ...user.value,
                            lastLoginAt: new Date(),
                            displayName: data.displayName,
                            avatarUrl: data.avatarUrl,
                            email: data.email,
                        });
                    }
                }

                // Create new user
                const newUser = yield* users.insert(
                    User.insert.make({
                        displayName: data.displayName,
                        email: data.email,
                        avatarUrl: data.avatarUrl,
                    })
                );

                // Create OAuth account link
                yield* oauthAccounts.insert(
                    OAuthAccount.insert.make({
                        userId: newUser.id,
                        provider: data.provider,
                        providerAccountId: data.providerAccountId,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        expiresAt: Option.map(data.expiresAt, (date: Date) => date),
                    })
                );

                return newUser;
            }).pipe(Effect.catchAll(() => Effect.die("Failed to upsert user from OAuth")));

        // Create a new session for a user
        const createSession = (userId: string, expiresInDays: number = 30): Effect.Effect<Session> =>
            Effect.gen(function* () {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + expiresInDays);

                return yield* sessions.insert(
                    Session.insert.make({
                        userId,
                        expiresAt,
                    })
                );
            }).pipe(Effect.catchAll(() => Effect.die("Failed to create session")));

        // Delete a session (logout)
        const deleteSession = (sessionId: string): Effect.Effect<void> =>
            sql`DELETE FROM sessions WHERE id = ${sessionId}`.pipe(
                Effect.asVoid,
                Effect.catchAll(() => Effect.void)
            );

        // Get user from session
        const getUserFromSession = (sessionId: string): Effect.Effect<Option.Option<User>> =>
            Effect.gen(function* () {
                const session = yield* findValidSession(sessionId);
                if (Option.isNone(session)) {
                    return Option.none();
                }
                return yield* users.findById(session.value.userId);
            }).pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

        return {
            users,
            oauthAccounts,
            sessions,
            findOAuthAccountByProvider,
            findUserByOAuthProvider,
            findValidSession,
            upsertUserFromOAuth,
            createSession,
            deleteSession,
            getUserFromSession,
        };
    }),
}) {}

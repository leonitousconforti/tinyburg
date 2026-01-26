import { VariantSchema } from "@effect/experimental";
import { Model, SqlClient, SqlSchema } from "@effect/sql";
import { DateTime, Duration, Effect, Option, Schema } from "effect";

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

        // Session repository
        const sessions = yield* Model.makeRepository(Session, {
            idColumn: "id",
            tableName: "sessions",
            spanPrefix: "@tinyburg/tinyburg.app/domain/Repository/sessions",
        });

        // Find a user by their OAuth provider and account ID
        const findUserByOAuthProvider = SqlSchema.findOne({
            Result: User,
            Request: Schema.Struct({
                provider: OAuthProvider,
                providerAccountId: Schema.String,
            }),
            execute: ({ provider, providerAccountId }) => sql`
                SELECT users.* FROM oauth_accounts
                LEFT JOIN users ON oauth_accounts.user_id = users.id
                WHERE oauth_accounts.provider = ${provider} AND oauth_accounts.provider_account_id = ${providerAccountId}
            `,
        });

        // Find a user by their session ID
        const findUserBySession = SqlSchema.findOne({
            Result: User,
            Request: Schema.Struct({
                sessionId: Schema.String,
            }),
            execute: ({ sessionId }) => sql`
                SELECT users.* FROM sessions
                LEFT JOIN users ON sessions.user_id = users.id
                WHERE sessions.id = ${sessionId} AND sessions.expires_at > NOW()
            `,
        });

        const upsertUserFromOAuth = ({
            provider,
            providerAccountId,
        }: {
            provider: Schema.Schema.Type<typeof OAuthProvider>;
            providerAccountId: string;
            displayName: string;
            email: Option.Option<string>;
            avatarUrl: Option.Option<string>;
        }) =>
            Effect.gen(function* () {
                const existingUser = yield* findUserByOAuthProvider({
                    provider,
                    providerAccountId,
                });

                if (Option.isSome(existingUser)) {
                    const now = yield* DateTime.now;
                    return yield* users.update({
                        ...existingUser.value,
                        lastLoginAt: VariantSchema.Override(now),
                    });
                }

                const newUser = yield* users.insert({
                    displayName: "",
                    avatarUrl: Option.none(),
                    createdAt: undefined,
                    lastLoginAt: undefined,
                });

                const resolver = SqlSchema.single({
                    Request: OAuthAccount.insert,
                    Result: OAuthAccount,
                    execute: (account) => sql`
                        INSERT INTO oauth_accounts ${sql.insert(account).returning("*")}
                    `,
                });

                yield* resolver({
                    provider,
                    providerAccountId,
                    userId: newUser.id,
                    createdAt: undefined,
                });

                return newUser;
            });

        const createSession = (user: User, expiresIn: Duration.DurationInput = Duration.days(30)) => {
            const expiresAt = Effect.map(DateTime.now, DateTime.addDuration(expiresIn));
            return Effect.flatMap(expiresAt, (expiresAt) =>
                sessions.insert({
                    userId: user.id,
                    createdAt: undefined,
                    expiresAt: VariantSchema.Override(expiresAt),
                })
            );
        };

        const deleteSession = (session: Session) => sessions.delete(session.id);

        return {
            // User management
            upsertUserFromOAuth,

            // Session management
            createSession,
            deleteSession,
            findUserBySession,
        };
    }),
}) {}

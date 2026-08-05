import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Function, Layer, Schema } from "effect";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

import { OAuthAccount, User } from "./models.ts";

export class UsersRepository extends Context.Service<UsersRepository>()(
    "@tinyburg/tinyburg.app/domain/UsersRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const users = yield* SqlModel.makeRepository(User, {
                spanPrefix: "tinyburg.app.domain.Repository.users",
                tableName: "users",
                idColumn: "id",
            });

            const findUserById = Function.flow(users.findById, Effect.catchNoSuchElement);
            const signInWithOAuth = SqlSchema.findOne({
                Result: User,
                Request: Schema.Struct({
                    provider: OAuthAccount.fields.provider,
                    providerAccountId: Schema.String,
                    displayName: Schema.String,
                    email: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
                    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
                }),
                execute: ({ avatarUrl, displayName, email, provider, providerAccountId }) =>
                    sql.withTransaction(
                        Effect.andThen(
                            sql`SELECT pg_advisory_xact_lock(hashtext(${provider} || ':' || ${providerAccountId}))`,
                            sql`
                                WITH existing_account AS (
                                    -- The account this provider account already belongs to, if any
                                    SELECT user_id FROM oauth_accounts
                                    WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}
                                ),
                                new_user AS (
                                    -- Insert a new user only if this provider account is a stranger
                                    INSERT INTO users (display_name, avatar_url, last_login_at)
                                    SELECT ${displayName}, ${avatarUrl}, NOW()
                                    WHERE NOT EXISTS (SELECT 1 FROM existing_account)
                                    RETURNING *
                                ),
                                new_account AS (
                                    -- Link the provider account to the user it just created
                                    INSERT INTO oauth_accounts (
                                        provider, provider_account_id, user_id, email, display_name, avatar_url
                                    )
                                    SELECT ${provider}, ${providerAccountId}, id, ${email}, ${displayName}, ${avatarUrl}
                                    FROM new_user
                                    ON CONFLICT (provider, provider_account_id) DO NOTHING
                                ),
                                refreshed_account AS (
                                    -- Or refresh what the provider says about a link we already hold
                                    UPDATE oauth_accounts SET
                                        email = ${email},
                                        display_name = ${displayName},
                                        avatar_url = ${avatarUrl},
                                        last_login_at = NOW()
                                    WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}
                                ),
                                returning_user AS (
                                    UPDATE users SET last_login_at = NOW()
                                    WHERE id = (SELECT user_id FROM existing_account)
                                    RETURNING *
                                )
                                SELECT * FROM returning_user
                                UNION ALL
                                SELECT * FROM new_user;
                            `
                        )
                    ),
            });

            const attemptLink = SqlSchema.findOne({
                Request: Schema.Struct({
                    userId: Schema.String.check(Schema.isUUID()),
                    provider: OAuthAccount.fields.provider,
                    providerAccountId: Schema.String,
                    displayName: Schema.String,
                    email: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
                    avatarUrl: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
                }),
                Result: Schema.Struct({ outcome: Schema.Literals(["linked", "alreadyLinked", "taken"]) }),
                execute: ({ avatarUrl, displayName, email, provider, providerAccountId, userId }) => sql`
                    WITH inserted AS (
                        INSERT INTO oauth_accounts (
                            provider, provider_account_id, user_id, email, display_name, avatar_url
                        )
                        VALUES (
                            ${provider}, ${providerAccountId}, ${userId}, ${email}, ${displayName}, ${avatarUrl}
                        )
                        ON CONFLICT (provider, provider_account_id) DO NOTHING
                        RETURNING user_id
                    )
                    SELECT CASE
                        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'linked'
                        -- Nothing was inserted, so the row was already there
                        -- before this statement began: this account's, or
                        -- somebody else's.
                        WHEN (
                            SELECT user_id FROM oauth_accounts
                            WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}
                        ) = ${userId} THEN 'alreadyLinked'
                        ELSE 'taken'
                    END AS outcome
                `,
            });

            const linkOAuthAccount = Function.flow(
                attemptLink,
                Effect.map((row) => row.outcome)
            );

            const listOAuthAccounts = SqlSchema.findAll({
                Request: Schema.String.check(Schema.isUUID()),
                Result: OAuthAccount,
                execute: (userId) => sql`
                    SELECT * FROM oauth_accounts
                    WHERE user_id = ${userId}
                    ORDER BY created_at ASC
                `,
            });

            const unlinkOAuthAccount = (options: {
                readonly userId: string;
                readonly provider: typeof OAuthAccount.fields.provider.Type;
                readonly providerAccountId: string;
            }): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        DELETE FROM oauth_accounts
                        WHERE user_id = ${options.userId}
                          AND provider = ${options.provider}
                          AND provider_account_id = ${options.providerAccountId}
                          -- Locking every one of the user's rows makes
                          -- concurrent unlinks take turns, so two of them
                          -- cannot both see a count above one and delete the
                          -- final two accounts out from under each other.
                          AND (
                            SELECT COUNT(*) FROM (
                                SELECT 1 FROM oauth_accounts WHERE user_id = ${options.userId} FOR UPDATE
                            ) AS locked
                          ) > 1
                        RETURNING provider
                    `,
                    (rows) => rows.length > 0
                );

            return {
                findUserById,
                signInWithOAuth,
                linkOAuthAccount,
                listOAuthAccounts,
                unlinkOAuthAccount,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, UsersRepository.make);
}

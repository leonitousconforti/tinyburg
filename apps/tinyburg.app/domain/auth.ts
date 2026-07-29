import { Effect, Context, Schema, Layer } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { User } from "./models.ts";

export class AuthRepository extends Context.Service<AuthRepository>()("@tinyburg/tinyburg.app/domain/AuthRepository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const upsertUserFromOAuth = SqlSchema.findOne({
            Result: User,
            Request: Schema.Struct({
                provider: Schema.Literals(["google", "discord"]),
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
            upsertUserFromOAuth,
        };
    }),
}) {
    static readonly Default = Layer.effect(this, AuthRepository.make);
}

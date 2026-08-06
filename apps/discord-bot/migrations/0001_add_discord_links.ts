import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- A Discord account bound to a Tinyburg account (the OIDC subject).
        --
        -- Both sides are UNIQUE, so the binding is one to one in both
        -- directions: a Discord account speaks for exactly one Tinyburg
        -- account, and a Tinyburg account answers to exactly one Discord
        -- account. Without the second constraint two Discord users could
        -- both claim the same tower owner, and every later feature that
        -- trusts "who is this" would inherit the ambiguity.
        --
        -- The display name and avatar are whatever the 'profile' scope
        -- shared at link time, kept only so replies can name the account
        -- without a round trip to the provider.
        CREATE TABLE IF NOT EXISTS discord_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            discord_user_id TEXT UNIQUE NOT NULL,
            sub UUID UNIQUE NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- A '/link' that has been started but not finished: the state and
        -- PKCE verifier for one authorization round trip.
        --
        -- Only a hash of the state is stored. The state itself travels in a
        -- URL, so it lands in browser history and in the provider's request
        -- logs; hashing means a copy recovered from either is not enough to
        -- claim the pending link.
        --
        -- This row is what makes the callback attributable at all. The
        -- browser that comes back carries no cookie of ours, so the state is
        -- the only thing tying it to the Discord user who ran the command.
        CREATE TABLE IF NOT EXISTS discord_pending_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            state_hash TEXT UNIQUE NOT NULL,
            code_verifier TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            -- Lets the callback rewrite the ephemeral reply. Expires at
            -- Discord after 15 minutes, outliving the row itself.
            interaction_token TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
        );

        CREATE INDEX IF NOT EXISTS idx_discord_pending_links_expires_at ON discord_pending_links(expires_at);
    `
);

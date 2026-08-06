import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * Grounds consent in a verified identity.
 *
 * Before this migration a player was in the study because a friend code showed
 * up in a Google Form, which proved nothing about who owned it. Consent now
 * hangs off a Tinyburg user who has linked (and therefore proven control of)
 * the TinyTower account, so both granting and revoking are authenticated acts.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- A consent record is the only thing that puts a player in the study.
        -- It is keyed by the Tinyburg user who proved ownership of the player,
        -- so a revocation can only ever come from the same account.
        CREATE TABLE IF NOT EXISTS consents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tinyburg_user_id UUID NOT NULL,
            player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ,

            -- One live consent per player. A player who revokes and later comes
            -- back gets a new row, leaving the first one as an audit trail.
            CONSTRAINT unique_live_consent UNIQUE (player_id, granted_at)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_live_player
            ON consents(player_id) WHERE revoked_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(tinyburg_user_id);

        -- Refresh tokens for the tinyburg.app 'towers' grant. The crawl runs on
        -- a schedule, long after the visitor has closed the tab, so a
        -- user-present access token is not enough. Tokens are stored encrypted;
        -- this table holds ciphertext only.
        CREATE TABLE IF NOT EXISTS tower_grants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tinyburg_user_id UUID NOT NULL UNIQUE,
            refresh_token_ciphertext TEXT NOT NULL,
            scope TEXT NOT NULL,
            issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            -- Set when the provider rejects the token, so the scheduler stops
            -- retrying a grant the user revoked upstream.
            invalidated_at TIMESTAMPTZ
        );

        -- Per-player crawl bookkeeping. Lives in its own table rather than on
        -- players so that a purge can drop the player row without leaving
        -- scheduler state behind.
        CREATE TABLE IF NOT EXISTS crawl_state (
            player_id TEXT PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
            last_crawled_at TIMESTAMPTZ,
            last_success_at TIMESTAMPTZ,
            -- Nimblebit's save timestamp, used to skip a pull when nothing moved.
            last_save_version TEXT,
            consecutive_failures INTEGER NOT NULL DEFAULT 0,
            next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_crawl_state_next_attempt ON crawl_state(next_attempt_at);

        -- The study only ever stores edges between two consenting players, which
        -- makes the graph an induced subgraph over a self-selected population.
        -- Recording how many friends were redacted (a count, never an identity)
        -- is what lets an analysis estimate the sampling rate and correct for
        -- the bias instead of silently reporting skewed degree distributions.
        CREATE TABLE IF NOT EXISTS friend_counts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
            observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            total_friends INTEGER NOT NULL,
            consented_friends INTEGER NOT NULL,

            CONSTRAINT consented_not_greater_than_total
                CHECK (consented_friends <= total_friends)
        );

        CREATE INDEX IF NOT EXISTS idx_friend_counts_player ON friend_counts(player_id, observed_at DESC);

        -- Deletion has to be provable, not just attempted. The purge workflow
        -- writes here so 'has my data been removed' has an auditable answer that
        -- outlives the rows it deleted.
        CREATE TABLE IF NOT EXISTS purge_receipts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            -- Deliberately not a foreign key: the player row is gone by the time
            -- this is written, which is the entire point of the receipt.
            player_id TEXT NOT NULL,
            tinyburg_user_id UUID NOT NULL,
            requested_at TIMESTAMPTZ NOT NULL,
            completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            edges_removed INTEGER NOT NULL,
            events_removed INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_purge_receipts_player ON purge_receipts(player_id);
    `
);

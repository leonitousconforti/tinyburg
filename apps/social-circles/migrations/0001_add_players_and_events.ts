import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// Postgresql database
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS players (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id TEXT UNIQUE NOT NULL,
            first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS friendship_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            to_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL CHECK (event_type IN ('friended', 'unfriended')),
            event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Prevent self-friendships
            CONSTRAINT no_self_friendship CHECK (from_player_id != to_player_id),

            -- Ensure uniqueness of directed friendship events at a given timestamp
            CONSTRAINT unique_friendship_event UNIQUE (from_player_id, to_player_id, event_timestamp)
        );

        -- Indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_friendship_events_timestamp ON friendship_events(event_timestamp);
        CREATE INDEX IF NOT EXISTS idx_friendship_events_from ON friendship_events(from_player_id, event_timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_friendship_events_to ON friendship_events(to_player_id, event_timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_friendship_events_directed_pair ON friendship_events(from_player_id, to_player_id, event_timestamp DESC);

        -- Materialized view for current one-way friendships (A has friended B)
        CREATE MATERIALIZED VIEW IF NOT EXISTS current_friendships AS
        SELECT
            fe.from_player_id,
            p1.player_id AS from_player,
            fe.to_player_id,
            p2.player_id AS to_player
        FROM (
            SELECT DISTINCT ON (from_player_id, to_player_id)
                from_player_id,
                to_player_id,
                event_type
            FROM friendship_events
            ORDER BY from_player_id, to_player_id, event_timestamp DESC
        ) AS fe
        JOIN players p1 ON fe.from_player_id = p1.id
        JOIN players p2 ON fe.to_player_id = p2.id
        WHERE fe.event_type = 'friended';

        CREATE UNIQUE INDEX IF NOT EXISTS idx_current_friendships_directed
            ON current_friendships(from_player_id, to_player_id);
        CREATE INDEX IF NOT EXISTS idx_current_friendships_from_player
            ON current_friendships(from_player);
        CREATE INDEX IF NOT EXISTS idx_current_friendships_to_player
            ON current_friendships(to_player);

        -- Materialized view for mutual friendships (A friended B AND B friended A)
        CREATE MATERIALIZED VIEW IF NOT EXISTS mutual_friendships AS
        SELECT
            a.from_player_id AS player_id_a,
            a.from_player AS player_a,
            a.to_player_id AS player_id_b,
            a.to_player AS player_b
        FROM current_friendships a
        JOIN current_friendships b
            ON a.from_player_id = b.to_player_id
            AND a.to_player_id = b.from_player_id
        WHERE a.from_player_id < a.to_player_id;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mutual_friendships_pair
            ON mutual_friendships(player_id_a, player_id_b);
        CREATE INDEX IF NOT EXISTS idx_mutual_friendships_player_a
            ON mutual_friendships(player_a);
        CREATE INDEX IF NOT EXISTS idx_mutual_friendships_player_b
            ON mutual_friendships(player_b);
    `
);

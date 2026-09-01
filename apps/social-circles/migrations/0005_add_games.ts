import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * Keys the study by game as well as by player.
 *
 * Before this migration a player was a friend code and nothing else. That was
 * true enough while TinyTower was the only game, but Nimblebit gives every game
 * its own player namespace, so the same five characters are a different person
 * in Pocket Planes than in TinyTower. Treating them as one identity would have
 * merged two people's circles the first time a second game was crawled.
 *
 * Everything that named a player now names a game with it, and the pair is what
 * the unique indexes, the foreign keys and the crawl scheduler are keyed by.
 *
 * The interesting part is `friendship_events`. It could have carried a game
 * column that the writing query was trusted to set correctly, but an edge whose
 * two endpoints came from different games is exactly the kind of mistake that
 * reads as plausible data forever after. Instead both endpoints are tied to the
 * event's own game by composite foreign key, so a cross-game edge is not
 * something the database will hold, whatever the query says.
 *
 * Existing rows are backfilled to `tinytower`, which is the only game the study
 * has ever crawled.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- The analytics views read the columns being reshaped, so they cannot
        -- survive the change. They are derived state and are rebuilt at the end.
        DROP MATERIALIZED VIEW IF EXISTS mutual_friendships;
        DROP MATERIALIZED VIEW IF EXISTS current_friendships;

        -- Every foreign key pointing at players goes first. They depend on the
        -- unique index this migration replaces, and Postgres will not drop an
        -- index out from under a constraint that uses it.
        ALTER TABLE consents DROP CONSTRAINT IF EXISTS consents_player_id_fkey;
        ALTER TABLE crawl_state DROP CONSTRAINT IF EXISTS crawl_state_player_id_fkey;
        ALTER TABLE friend_counts DROP CONSTRAINT IF EXISTS friend_counts_player_id_fkey;
        ALTER TABLE friendship_events DROP CONSTRAINT IF EXISTS friendship_events_from_player_id_fkey;
        ALTER TABLE friendship_events DROP CONSTRAINT IF EXISTS friendship_events_to_player_id_fkey;

        -- A player is (game, friend code). The default backfills the rows that
        -- predate the column and is then dropped, so a later insert that forgets
        -- to say which game it means fails instead of silently meaning TinyTower.
        ALTER TABLE players ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE players ALTER COLUMN game DROP DEFAULT;

        ALTER TABLE players DROP CONSTRAINT IF EXISTS players_player_id_key;
        ALTER TABLE players ADD CONSTRAINT players_game_player_id_key UNIQUE (game, player_id);

        -- What the composite foreign keys below point at. Redundant given id is
        -- already the primary key, but a foreign key needs a unique index on
        -- exactly the columns it references.
        ALTER TABLE players ADD CONSTRAINT players_game_id_key UNIQUE (game, id);

        ALTER TABLE friendship_events ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE friendship_events ALTER COLUMN game DROP DEFAULT;

        -- Both endpoints must belong to the game the edge claims to be in.
        ALTER TABLE friendship_events ADD CONSTRAINT friendship_events_from_fkey
            FOREIGN KEY (game, from_player_id) REFERENCES players(game, id) ON DELETE CASCADE;
        ALTER TABLE friendship_events ADD CONSTRAINT friendship_events_to_fkey
            FOREIGN KEY (game, to_player_id) REFERENCES players(game, id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_friendship_events_game ON friendship_events(game, event_timestamp DESC);

        -- Consent is per tower, and a player who took part in one game has said
        -- nothing about another.
        ALTER TABLE consents ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE consents ALTER COLUMN game DROP DEFAULT;

        ALTER TABLE consents ADD CONSTRAINT consents_game_player_id_fkey
            FOREIGN KEY (game, player_id) REFERENCES players(game, player_id) ON DELETE CASCADE;

        ALTER TABLE consents DROP CONSTRAINT IF EXISTS unique_live_consent;
        ALTER TABLE consents ADD CONSTRAINT unique_live_consent UNIQUE (game, player_id, granted_at);

        DROP INDEX IF EXISTS idx_consents_live_player;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_live_player
            ON consents(game, player_id) WHERE revoked_at IS NULL;

        -- Scheduler state is per tower too: one game's tower being unreachable
        -- must not back off another game's.
        ALTER TABLE crawl_state ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE crawl_state ALTER COLUMN game DROP DEFAULT;

        ALTER TABLE crawl_state DROP CONSTRAINT IF EXISTS crawl_state_pkey;
        ALTER TABLE crawl_state ADD CONSTRAINT crawl_state_pkey PRIMARY KEY (game, player_id);
        ALTER TABLE crawl_state ADD CONSTRAINT crawl_state_game_player_id_fkey
            FOREIGN KEY (game, player_id) REFERENCES players(game, player_id) ON DELETE CASCADE;

        ALTER TABLE friend_counts ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE friend_counts ALTER COLUMN game DROP DEFAULT;

        ALTER TABLE friend_counts ADD CONSTRAINT friend_counts_game_player_id_fkey
            FOREIGN KEY (game, player_id) REFERENCES players(game, player_id) ON DELETE CASCADE;

        DROP INDEX IF EXISTS idx_friend_counts_player;
        CREATE INDEX IF NOT EXISTS idx_friend_counts_player
            ON friend_counts(game, player_id, observed_at DESC);

        -- A receipt outlives the rows it describes, so it has no foreign key and
        -- has to carry the game itself to stay meaningful.
        ALTER TABLE purge_receipts ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tinytower';
        ALTER TABLE purge_receipts ALTER COLUMN game DROP DEFAULT;

        DROP INDEX IF EXISTS idx_purge_receipts_player;
        CREATE INDEX IF NOT EXISTS idx_purge_receipts_player ON purge_receipts(game, player_id);

        -- The views again, now carrying the game. An edge cannot span games, so
        -- one column on the row describes both of its endpoints.
        CREATE MATERIALIZED VIEW IF NOT EXISTS current_friendships AS
        SELECT
            fe.game,
            fe.from_player_id,
            p1.player_id AS from_player,
            fe.to_player_id,
            p2.player_id AS to_player
        FROM (
            SELECT DISTINCT ON (game, from_player_id, to_player_id)
                game,
                from_player_id,
                to_player_id,
                event_type
            FROM friendship_events
            ORDER BY game, from_player_id, to_player_id, event_timestamp DESC
        ) AS fe
        JOIN players p1 ON fe.from_player_id = p1.id
        JOIN players p2 ON fe.to_player_id = p2.id
        WHERE fe.event_type = 'friended';

        CREATE UNIQUE INDEX IF NOT EXISTS idx_current_friendships_directed
            ON current_friendships(game, from_player_id, to_player_id);
        CREATE INDEX IF NOT EXISTS idx_current_friendships_from_player
            ON current_friendships(game, from_player);
        CREATE INDEX IF NOT EXISTS idx_current_friendships_to_player
            ON current_friendships(game, to_player);

        CREATE MATERIALIZED VIEW IF NOT EXISTS mutual_friendships AS
        SELECT
            a.game,
            a.from_player_id AS player_id_a,
            a.from_player AS player_a,
            a.to_player_id AS player_id_b,
            a.to_player AS player_b
        FROM current_friendships a
        JOIN current_friendships b
            ON a.game = b.game
            AND a.from_player_id = b.to_player_id
            AND a.to_player_id = b.from_player_id
        WHERE a.from_player_id < a.to_player_id;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mutual_friendships_pair
            ON mutual_friendships(game, player_id_a, player_id_b);
        CREATE INDEX IF NOT EXISTS idx_mutual_friendships_player_a
            ON mutual_friendships(game, player_a);
        CREATE INDEX IF NOT EXISTS idx_mutual_friendships_player_b
            ON mutual_friendships(game, player_b);
    `
);

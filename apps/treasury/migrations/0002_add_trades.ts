import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * The trade book.
 *
 * Every state transition anywhere in the treasury is a guarded UPDATE
 * (`... WHERE state = ANY(...)`) against these tables, so the database is
 * the arbiter of every race: double-accepts, cancel-versus-escrow, two
 * reconcilers claiming one gift. Handlers and workflows only ever propose a
 * transition and observe whether it took.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS trades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            mechanism TEXT NOT NULL CHECK (mechanism IN ('gift', 'splice')),
            game TEXT NOT NULL DEFAULT 'tinytower' CHECK (game = 'tinytower'),
            state TEXT NOT NULL DEFAULT 'proposed' CHECK (state IN (
                'proposed', 'accepted', 'awaiting_confirmation', 'escrowing', 'escrowed',
                'releasing', 'executing', 'settled',
                'cancelled', 'refunding', 'refunded', 'expired', 'failed')),
            proposer_user_id UUID NOT NULL,
            proposer_player_id TEXT NOT NULL,
            -- NULL while the offer is open; bound (guarded) at accept.
            counterparty_user_id UUID,
            counterparty_player_id TEXT,
            -- The agreed offer, as the JSON text of the sdk's ItemSpec, from
            -- the proposer's point of view.
            gives TEXT NOT NULL,
            wants TEXT NOT NULL,
            -- Splice only: the explicit both-sides confirmation the web app
            -- collects before any save is touched.
            proposer_confirmed_at TIMESTAMPTZ,
            counterparty_confirmed_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ NOT NULL,
            failure_reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT splice_confirmations_only CHECK (
                mechanism = 'splice'
                OR (proposer_confirmed_at IS NULL AND counterparty_confirmed_at IS NULL)
            ),
            -- Nothing moves for a trade that has no second side.
            CONSTRAINT bound_before_moving CHECK (
                state IN ('proposed', 'cancelled', 'expired', 'failed')
                OR counterparty_user_id IS NOT NULL
            )
        );

        CREATE INDEX IF NOT EXISTS idx_trades_proposer ON trades(proposer_user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_counterparty ON trades(counterparty_user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_expiry ON trades(expires_at) WHERE state IN (
            'proposed', 'accepted', 'awaiting_confirmation', 'escrowing', 'escrowed');

        -- Gift mechanism only; a splice trade carries a plan instead.
        CREATE TABLE IF NOT EXISTS trade_legs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trade_id UUID NOT NULL REFERENCES trades(id),
            role TEXT NOT NULL CHECK (role IN ('proposer', 'counterparty')),
            depositor_user_id UUID NOT NULL,
            from_player_id TEXT NOT NULL,
            to_player_id TEXT NOT NULL,
            vault_player_id TEXT NOT NULL,
            item_type TEXT NOT NULL,
            -- The agreed contents, verbatim. Deposit verification matches the
            -- vault's gift against this exact string, which is the
            -- bait-and-switch check.
            item_str TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
                'pending', 'sent', 'verified', 'released', 'settled',
                'refund_sent', 'refunded', 'lost')),
            -- Set at 'verified'. Unique, so one escrow slot in the vault's
            -- gift queue can never back two legs.
            vault_gift_id BIGINT UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT one_leg_per_side UNIQUE (trade_id, role)
        );

        CREATE INDEX IF NOT EXISTS idx_trade_legs_trade ON trade_legs(trade_id);
        CREATE INDEX IF NOT EXISTS idx_trade_legs_open ON trade_legs(state) WHERE state IN ('sent', 'verified');

        CREATE TABLE IF NOT EXISTS splice_plans (
            trade_id UUID PRIMARY KEY REFERENCES trades(id),
            -- Captured at pull; checked against Nimblebit again immediately
            -- before push, so a player who synced mid-trade aborts the splice
            -- instead of losing progress.
            proposer_save_id INTEGER,
            counterparty_save_id INTEGER,
            -- The saves as pulled and as spliced. Originals are kept so a
            -- failed second push can restore the first side.
            proposer_original TEXT,
            counterparty_original TEXT,
            proposer_spliced TEXT,
            counterparty_spliced TEXT
        );
    `
);

import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * The escrow ledger: every consequential thing the treasury did or observed,
 * append-only. This is the audit trail that compensates for the vault
 * talking to Nimblebit directly rather than through the trading api's
 * logging, and it is what "where is my item" is answered from.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS escrow_ledger (
            id BIGSERIAL PRIMARY KEY,
            -- Nullable: the reconciler records gifts that arrived at the
            -- vault matching no trade at all.
            trade_id UUID,
            leg_id UUID,
            event TEXT NOT NULL,
            detail TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_escrow_ledger_trade ON escrow_ledger(trade_id, id);

        -- Append-only, enforced where it cannot be forgotten.
        CREATE RULE escrow_ledger_no_update AS ON UPDATE TO escrow_ledger DO INSTEAD NOTHING;
        CREATE RULE escrow_ledger_no_delete AS ON DELETE TO escrow_ledger DO INSTEAD NOTHING;
    `
);

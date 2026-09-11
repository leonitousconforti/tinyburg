/**
 * The scopes the treasury api is guarded by, as one `treasury` area.
 *
 * These guard the treasury's own api - proposing, accepting and watching
 * trades - not the towers the trades move items between. Acting on a tower
 * (depositing an item into escrow, splicing a save) happens through the
 * trading api under that game's own scopes, with a grant the player gives the
 * treasury separately on the consent screen. Splitting the two means "let the
 * treasury manage my trades" and "let the treasury touch my tower" are
 * distinct questions with distinct answers.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as ResourceServer from "effect-oidc/ResourceServer";

import { defineArea } from "@tinyburg/nimblebit-sdk/NimblebitScopes";

/**
 * @since 1.0.0
 * @category Areas
 */
export const Treasury = defineArea({
    name: "treasury",
    description: "Trades escrowed by the Tinyburg treasury",
    read: {
        description: "See your trades and what could go into them, without changing anything",
        leaves: {
            grant_status: "Check whether the treasury can act on your towers",
            list_trades: "List your trades and the open offers you could accept",
            get_trade: "See one trade's full state and history",
            list_inventory: "See which of a tower's items could be traded",
        },
    },
    write: {
        description: "Propose, accept, cancel and confirm trades",
        leaves: {
            propose: "Propose a trade with another player",
            accept: "Accept a trade proposed to you",
            cancel: "Cancel a trade you are part of",
            confirm_splice: "Confirm a save-splice trade for execution",
        },
    },
});

/**
 * The shape of the treasury's area, for code that takes it as a value.
 *
 * @since 1.0.0
 * @category Areas
 */
export type TreasuryArea = typeof Treasury;

/**
 * Every scope in the tree, the area first, then each branch, then its
 * leaves. The order a consent screen lists them in.
 *
 * @since 1.0.0
 * @category Tree
 */
export const all = (): ReadonlyArray<ResourceServer.ScopeDescription> => [
    Treasury,
    Treasury.read,
    ...Treasury.read.children,
    Treasury.write,
    ...Treasury.write.children,
];

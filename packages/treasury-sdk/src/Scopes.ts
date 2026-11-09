/**
 * The scopes the treasury api is guarded by: `treasury` for all of it,
 * `treasury:read` and `treasury:write` for everything that only looks or that
 * changes a trade, and one scope per endpoint, such as
 * `treasury:list_trades`. An endpoint accepts its own scope, its side's and
 * the whole treasury's, narrowest first:
 * `{ anyOf: [ListTrades, Read, Treasury] }`.
 *
 * These guard the treasury's own api - proposing, accepting and watching
 * trades - not the towers the trades move items between. Acting on a tower
 * (depositing an item into escrow, splicing a save) happens through the
 * tinyburg api under that game's own scopes, with a grant the player gives the
 * treasury separately on the consent screen. Splitting the two means "let the
 * treasury manage my trades" and "let the treasury touch my tower" are
 * distinct questions with distinct answers.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Treasury
 */
export const Treasury: OAuthScope.Described = {
    name: OAuthScope.make("treasury"),
    description: "Trades escrowed by the Tinyburg treasury",
};

/**
 * @since 1.0.0
 * @category Treasury
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("treasury:read"),
    description: "See your trades and what could go into them, without changing anything",
};

/**
 * @since 1.0.0
 * @category Treasury
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("treasury:write"),
    description: "Propose, accept, cancel and confirm trades",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const GrantStatus: OAuthScope.Described = {
    name: OAuthScope.make("treasury:grant_status"),
    description: "Check whether the treasury can act on your towers",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ListTrades: OAuthScope.Described = {
    name: OAuthScope.make("treasury:list_trades"),
    description: "List your trades and the open offers you could accept",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const GetTrade: OAuthScope.Described = {
    name: OAuthScope.make("treasury:get_trade"),
    description: "See one trade's full state and history",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ListInventory: OAuthScope.Described = {
    name: OAuthScope.make("treasury:list_inventory"),
    description: "See which of a tower's items could be traded",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const Propose: OAuthScope.Described = {
    name: OAuthScope.make("treasury:propose"),
    description: "Propose a trade with another player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const Accept: OAuthScope.Described = {
    name: OAuthScope.make("treasury:accept"),
    description: "Accept a trade proposed to you",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const Cancel: OAuthScope.Described = {
    name: OAuthScope.make("treasury:cancel"),
    description: "Cancel a trade you are part of",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ConfirmSplice: OAuthScope.Described = {
    name: OAuthScope.make("treasury:confirm_splice"),
    description: "Confirm a save-splice trade for execution",
};

/**
 * Every scope, in the order a consent screen lists them: the treasury, its
 * read scope and the read endpoints' scopes, then its write scope and the
 * write endpoints'.
 *
 * @since 1.0.0
 * @category Treasury
 */
export const all = (): ReadonlyArray<OAuthScope.Described> => [
    Treasury,
    Read,
    GrantStatus,
    ListTrades,
    GetTrade,
    ListInventory,
    Write,
    Propose,
    Accept,
    Cancel,
    ConfirmSplice,
];

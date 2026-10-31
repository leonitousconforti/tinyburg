/**
 * @since 1.0.0
 */

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
 * The area is built with the same `defineArea` every game's scopes are, so
 * `Treasury.read.list_trades` is the leaf named `treasury:list_trades`, and
 * `Treasury.read.list_trades.required` is what goes on the endpoint.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * The api the treasury serves: player-to-player trades, escrowed.
 *
 * Nimblebit has no hold primitive, so the treasury makes one out of the gift
 * channel: each side's item is sent to a treasury-owned vault tower, where it
 * sits as an *unreceived* gift - a native escrow slot - until both deposits
 * are verified, and only then is each item forwarded to the other side. A
 * save-splice trade instead rewrites both saves directly, which is why it
 * requires an explicit confirmation from both parties before anything runs.
 *
 * Every endpoint but the public stats is bearer authenticated with a JWT
 * access token the Tinyburg OAuth server issued for the Tinyburg api
 * (`<site>/v1`), and guarded by a leaf of the `treasury` scope area in
 * `Scopes`. The treasury lives behind tinyburg.app: the paths here are
 * reached at `<site>/v1/treasury/*`, which tinyburg.app forwards verbatim,
 * `Authorization` header included. The first-party app gets its token from
 * tinyburg.app's `/auth/token`; any other application uses the one it was
 * issued.
 *
 * A token without the endpoint's scope is refused with `403` and an
 * `insufficient_scope` challenge. Any other `403` from a trade endpoint
 * means the treasury holds no usable grant for the caller's towers;
 * `GrantStatus` says so explicitly and carries the url that starts the
 * connect flow.
 *
 * @since 1.0.0
 */
export * as Sdk from "./Sdk.ts"

/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category Bitbook Posts
 */
export * as BitbookPosts from "./BitbookPosts.ts"

/**
 * @since 1.0.0
 * @category Bitizens
 */
export * as Bitizens from "./Bitizens.ts"

/**
 * @since 1.0.0
 * @category Costumes
 */
export * as Costumes from "./Costumes.ts"

/**
 * @since 1.0.0
 * @category Elevators
 */
export * as Elevators from "./Elevators.ts"

/**
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * @since 1.0.0
 * @category Floors
 */
export * as Floors from "./Floors.ts"

/**
 * @since 1.0.0
 * @category Gifts
 */
export * as Gift from "./Gift.ts"

/**
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * @since 1.0.0
 * @category Pets
 */
export * as Pets from "./Pets.ts"

/**
 * @since 1.0.0
 * @category Roofs
 */
export * as Roofs from "./Roofs.ts"

/**
 * Patch based editing of TinyTower save data.
 *
 * Rewriting a save in place is how an escrow moves something between two
 * players, and doing it by hand is how saves get corrupted. This module makes
 * the edit itself a value: a {@link SavePatch} is an ordered list of small,
 * serializable operations, and {@link differ} knows how to compute one, combine
 * two, and apply one.
 *
 * Modelling the edit as data rather than a function buys three things escrow
 * needs. A patch can be written to a database and applied later (that is what
 * "holding" an item means). A patch can be inspected and logged, so a support
 * request has an audit trail. And `diff` answers "what changed under us?" when
 * a player keeps playing between our download and our upload.
 *
 * ## What can be edited
 *
 * Four kinds of thing, grouped by how they behave rather than by what type they
 * happen to hold:
 *
 * - The ordered collections, `stories` (floors) and `bzns` (bitizens), plus the
 *   doorman, who is a bitizen kept outside the list.
 * - Collections of owned things — costumes, pets, roofs, lifts, lobbies —
 *   through {@link ItemsGranted} and {@link ItemsRevoked}.
 * - Counters, through {@link CounterAdjusted}, which moves a number by a
 *   distance instead of overwriting it. All three currencies are counters:
 *   `coins`, `bux`, and `gold`, which is golden tickets.
 * - Everything else scalar, through {@link FieldSet}, which takes its value as
 *   text the way the save itself stores it. That covers the fields `SaveData`
 *   names and the many it does not: a real save carries around sixty further
 *   raw entries, including at least eight more event currencies, and they are
 *   reachable by the same two operations as everything else.
 *
 * Two properties are deliberate rather than incidental. {@link ItemsGranted},
 * {@link ItemsRevoked} and {@link FieldSet} are **idempotent**, so a deposit
 * that crashes partway and gets retried cannot duplicate anything. And
 * {@link CounterAdjusted}, {@link ItemsGranted} and {@link FloorAppended} are
 * **position-free**, so a patch holding them means the same thing against any
 * save — which is what lets an escrow replay one into a tower that is not the
 * one it came from.
 *
 * Operations describe *what* to change, never *whether* it is allowed. Refusing
 * an edit that would corrupt a save is `Splice`'s job, and deciding what may be
 * traded at all belongs further up still.
 *
 * @since 1.0.0
 * @category Differ
 */
export * as SaveDiffer from "./SaveDiffer.ts"

/**
 * Moving one thing out of a tower and into another.
 *
 * An escrow holds an item by taking it out of its owner's save and keeping it
 * until a trade settles, then putting it into somebody else's. Both halves are
 * expressed here as {@link SaveDiffer.SavePatch} values: {@link extract} returns
 * the patch it applied alongside the {@link Holding} to keep, and {@link insert}
 * turns a holding back into a patch. Nothing here talks to the network or a
 * database, so the risky part of a trade is a pure function that can be tested
 * against real saves.
 *
 * ## What can move
 *
 * A {@link Selector} names something in a save; the matching {@link Holding} is
 * what escrow keeps. Floors, bitizens, costumes, pets, the roof/lift/lobby
 * fittings a player has collected, and currency.
 *
 * ## Refusing rather than guessing
 *
 * `SaveDiffer` will make any edit asked of it. This module is the layer that
 * says no, and it says no whenever the result would be a save that contradicts
 * itself: a tower with no lobby, a bitizen whose home does not exist, a costume
 * removed from a wardrobe while somebody is still wearing it, a fitting sold
 * out from under the tower using it, a balance spent past zero.
 *
 * What it does *not* encode is whether a thing ought to be tradeable at all.
 * That is a marketplace decision and belongs further up. One consequence worth
 * stating plainly: `bux` and `gold` are bought with real money in NimbleBit's
 * own storefront, and `specs/MONETIZATION.md` calls substituting for their IAP
 * revenue the fastest route to a cease and desist. Moving them is mechanically
 * sound and implemented here; allowing players to trade them is a separate
 * decision, and not one this module makes.
 *
 * ## Which bitizens travel with a floor
 *
 * A bitizen names the floor they live on and the floor they work on by *type*
 * (`homeIndex` and `workIndex` are positions in the `Floors.floors` catalogue,
 * not positions in the tower), and every bitizen observed so far has a home
 * while plenty have no job. That gives one rule that keeps every reference
 * valid on both sides of a trade:
 *
 * > A bitizen travels if and only if their home travels.
 *
 * So a residential floor leaves with its residents, who arrive jobless because
 * the floor they worked on stayed behind. A commercial floor leaves empty, and
 * the bitizens who worked there stay in their homes and become jobless. The
 * alternative — sending workers along with a shop — would land them in a tower
 * with no home to point at, which is exactly the sort of half-understood edit
 * this module refuses to make. A bitizen moved on their own is the same rule
 * read backwards: the receiving tower must already have their home floor.
 *
 * ## Two of a kind
 *
 * Because the reference is by type, a tower holding two floors of the same type
 * gives no way to say which of them a bitizen belongs to, and extraction
 * refuses with `AmbiguousFloor`. Real towers almost never hit this — of thirty
 * one surveyed, one had duplicates and they were all empty construction sites —
 * but insertion does not stop a trade from creating the situation, so a player
 * who accepts a second Regal Apts. can no longer trade either of them. Fixing
 * that needs a rule about which copy owns whom, which is a game design question
 * rather than a parsing one.
 *
 * @since 1.0.0
 * @category Splice
 */
export * as Splice from "./Splice.ts"

/**
 * The type of sync item.
 *
 * @since 1.0.0
 * @category SyncItem
 */
export * as SyncItemType from "./SyncItemType.ts"

/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTower from "./TinyTower.ts"

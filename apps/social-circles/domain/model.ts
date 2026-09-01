/**
 * Schemas for the social-circles study.
 *
 * The one rule the whole study rests on: a friendship edge is data about two
 * people, so an edge exists only when *both* endpoints hold a live consent
 * record. Everything here is shaped to make that rule cheap to enforce.
 */

import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { GameId } from "./games.ts";

/**
 * A player known to the study. Presence here is not consent: it only means the
 * id has been seen. {@link Consent} is what admits a player to the graph.
 *
 * @since 1.0.0
 * @category Model
 */
export class Player extends Model.Class<Player>("Player")({
    id: Model.GeneratedByDb(Schema.String.check(Schema.isUUID())),
    game: GameId,
    playerId: PlayerIdSchema,
    firstSeenAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * Permission to include a player in the study, granted by the Tinyburg user who
 * proved control of that TinyTower account. Revocation is authenticated by the
 * same binding, which is what the old friend-code-in-a-form flow could not do.
 *
 * @since 1.0.0
 * @category Model
 */
export class Consent extends Model.Class<Consent>("Consent")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    tinyburgUserId: Schema.String.check(Schema.isUUID()),
    game: GameId,
    playerId: PlayerIdSchema,
    grantedAt: Model.DateTimeInsertFromDate,
    revokedAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
}) {}

/**
 * A stored `towers` grant, letting the scheduled crawl act for a user who is no
 * longer at the keyboard. Only ciphertext is persisted, and the refresh token
 * never leaves the server.
 *
 * @since 1.0.0
 * @category Model
 */
export class TowerGrant extends Model.Class<TowerGrant>("TowerGrant")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    tinyburgUserId: Schema.String.check(Schema.isUUID()),
    refreshTokenCiphertext: Schema.String.pipe(Model.FieldOnly(["select", "insert", "update"])),
    scope: Schema.String,
    issuedAt: Model.DateTimeInsertFromDate,
    invalidatedAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
}) {}

/**
 * Scheduler bookkeeping for one player's crawl.
 *
 * @since 1.0.0
 * @category Model
 */
export class CrawlState extends Model.Class<CrawlState>("CrawlState")({
    game: GameId,
    playerId: PlayerIdSchema,
    lastCrawledAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
    lastSuccessAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
    lastSaveVersion: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    consecutiveFailures: Schema.Finite,
    nextAttemptAt: Schema.DateTimeUtcFromDate,
    lastError: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
}) {}

/**
 * How much of a player's friends list the study was allowed to keep, as counts
 * only. Without this the dataset looks like a complete network when it is
 * really an induced subgraph over volunteers.
 *
 * @since 1.0.0
 * @category Model
 */
export class FriendCount extends Model.Class<FriendCount>("FriendCount")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    game: GameId,
    playerId: PlayerIdSchema,
    observedAt: Model.DateTimeInsertFromDate,
    totalFriends: Schema.Finite,
    consentedFriends: Schema.Finite,
}) {}

/**
 * Evidence that a deletion request actually finished. Survives the rows it
 * describes, so "was my data removed" has an answer.
 *
 * @since 1.0.0
 * @category Model
 */
export class PurgeReceipt extends Model.Class<PurgeReceipt>("PurgeReceipt")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    game: GameId,
    playerId: PlayerIdSchema,
    tinyburgUserId: Schema.String.check(Schema.isUUID()),
    requestedAt: Schema.DateTimeUtcFromDate,
    completedAt: Model.DateTimeInsertFromDate,
    edgesRemoved: Schema.Finite,
    eventsRemoved: Schema.Finite,
}) {}

/**
 * A player id, re-exported so callers do not have to reach into the sdk.
 *
 * On its own this is only a friend code: it identifies a person just within one
 * game, so almost everything here pairs it with a {@link GameId}.
 *
 * @since 1.0.0
 * @category Model
 */
export type PlayerId = typeof PlayerIdSchema.Type;

/**
 * @since 1.0.0
 */

/**
 * Every car a Pocket Trains train can haul, by id: freight (type `j`) or
 * passengers (type `p`), with its value from 1 to 4 and the table's `active` flag.
 *
 * @since 1.0.0
 * @category Cars
 */
export * as Cars from "./Cars.ts"

/**
 * Pocket Trains' cities by id, with the region each is in, and its regions.
 *
 * @since 1.0.0
 * @category Cities
 */
export * as Cities from "./Cities.ts"

/**
 * Pocket Trains (game code `pt`) NBSync api endpoints.
 *
 * Signing: a random `salt` (uint32 here; no negative game salt has been
 * observed) goes in the path, and `hash` is `md5(<preimage> + <game secret
 * salt>)` with the preimage `pt/<playerId>/<salt><playerAuthKey>` (variants
 * noted per endpoint). The secret salt is the value extracted from `NBSync._ss`.
 * The game itself signs every NBSync request it was seen making with SHA-256
 * over the same preimage plus a second 64-char secret derived via `NBSync.Q`.
 * The server accepts both schemes.
 *
 * Provenance, per endpoint (2026-11-09):
 *
 * - OBSERVED: the game made this request (Play build 1.10.2).
 * - REPLAYED: the SDK's client function succeeded against the live server.
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * POST bodies: the game was seen posting form fields (friend/pull_meta), but a
 * `Schema.Struct` payload is sent as JSON. Whether the server accepts JSON is
 * unverified.
 *
 * Not modelled yet (LITERAL only): `friend/pull_meta_gift_id`, `send_pt`,
 * `register_pt`, `register_email`, `new_id/verify`. Facebook and Play Games
 * login flows: `register_fb`, `swap_fb`, `register_pg`, `swap_pg`, `check_pg`.
 * The game also fetches an unsigned iCalendar from
 * `s3.amazonaws.com/NBStatic/sync/tt/current.ics` (OBSERVED), which is not an
 * NBSync endpoint.
 *
 * Game-specific save, meta and gift schemas are left as `Schema.Unknown`
 * placeholders where their wire format was not observed.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Pocket Trains' engines by id, with each one's level, speed, fuel and how
 * many cars, engines and tenders its train takes, and whether it is special.
 *
 * @since 1.0.0
 * @category Engines
 */
export * as Engines from "./Engines.ts"

/**
 * The city events Pocket Trains picks from, in the game's order: a story with
 * `%c` for the city, the car its jobs haul into the city (`inbound`) or out of
 * it, and the costume of its passengers, if any.
 *
 * @since 1.0.0
 * @category Events
 */
export * as Events from "./Events.ts"

/**
 * Pocket Trains SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * Each preimage matches the one the game was seen signing, except `get_items`,
 * whose game request was not observed. The game hashes with SHA-256 and another
 * secret instead; the server accepts both.
 *
 * Each method says whether the game was OBSERVED making its request and whether
 * the method was REPLAYED against sync.nimblebit.com (2026-11-09). Save bytes
 * are returned raw (base64-decoded); inflating (pako) and parsing into a save
 * schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as PocketTrains from "./PocketTrains.ts"

/**
 * The scopes the Pocket Trains api is guarded by: `pockettrains` for the whole
 * game, `pockettrains:read` and `pockettrains:write` for every endpoint that
 * only looks or that changes a player's game, a `:read` and a `:write` scope
 * for each area of the api, such as `pockettrains:device:read`, and one scope
 * per endpoint, such as `pockettrains:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketTrains] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `pockettrains:read` or `pockettrains`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Every track Pocket Trains has, by id, with the two cities it joins and its
 * length.
 *
 * @since 1.0.0
 * @category Tracks
 */
export * as Tracks from "./Tracks.ts"

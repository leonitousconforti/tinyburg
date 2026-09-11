/**
 * @since 1.0.0
 */

/**
 * Authentication providers for connecting to Nimblebit's servers.
 *
 * @since 1.0.0
 * @category Auth
 */
export * as NimblebitAuth from "./NimblebitAuth.ts"

/**
 * Configuration and schemas for authenticating with Nimblebit's cloud sync
 * service.
 *
 * @since 1.0.0
 * @category Config
 */
export * as NimblebitConfig from "./NimblebitConfig.ts"

/**
 * Nimblebit error schemas.
 *
 * @since 1.0.0
 * @category Errors
 */
export * as NimblebitError from "./NimblebitError.ts"

/**
 * Every Nimblebit game with a cloud sync service, and the several names each
 * one goes by.
 *
 * @since 1.0.0
 * @category Games
 */
export * as NimblebitGame from "./NimblebitGame.ts"

/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */
export * as NimblebitSchema from "./NimblebitSchema.ts"

/**
 * The scope tree every Nimblebit game's api is guarded by.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as NimblebitScopes from "./NimblebitScopes.ts"

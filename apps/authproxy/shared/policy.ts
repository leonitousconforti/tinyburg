/**
 * What the self-service dashboard will hand out, as opposed to what there is
 * to hand out: the catalog is read off the TinyTower endpoints in
 * `../domain/scopes.ts`, and these are this proxy's rules about issuing keys
 * over it. Shared with the browser, so nothing heavier than a number lives
 * here.
 *
 * @since 1.0.0
 */

/** How many keys one Tinyburg account may hold at a time. */
export const MAX_KEYS_PER_USER = 5;

/** The rate limit a freshly provisioned self-service key starts with. */
export const DEFAULT_RATE_LIMIT = { limit: 10, windowMillis: 60_000 } as const;

/**
 * The scope catalog the self-service dashboard offers. A scope is a path
 * prefix the authorization middleware matches requests against, so this file
 * is the one place the proxy's endpoints are named for people rather than
 * for code.
 *
 * @since 1.0.0
 */

/** One scope as the dashboard presents it. */
export interface ScopeDescription {
    /** The path prefix the authorization middleware matches against. */
    readonly path: string;
    readonly label: string;
    readonly description: string;
}

/**
 * Read-only scopes anyone signed in may grant themselves. This is the same
 * set the seeded public readonly key carries.
 *
 * @since 1.0.0
 * @category Catalog
 */
export const SELF_SERVE_SCOPES: ReadonlyArray<ScopeDescription> = [
    {
        path: "/player_details/tt/",
        label: "Player details",
        description: "Look up a player's public profile details",
    },
    {
        path: "/sync/pull/tt/",
        label: "Pull save",
        description: "Download a tower's current save data",
    },
    {
        path: "/sync/current_version/tt/",
        label: "Save version",
        description: "Check the current version of a tower's save",
    },
    {
        path: "/sync/pull_snapshot/tt/",
        label: "Pull snapshot",
        description: "Download a specific cloud snapshot",
    },
    {
        path: "/sync/current_snapshots/tt/",
        label: "List snapshots",
        description: "List the cloud snapshots a tower has",
    },
    {
        path: "/sync/current_player_snapshots/tt/",
        label: "Friend snapshots",
        description: "List the cloud snapshots a friend's tower has",
    },
    {
        path: "/raffle/entered_current/tt/",
        label: "Raffle status",
        description: "Check whether a player entered the current raffle",
    },
    {
        path: "/get_gifts/tt/",
        label: "Pending gifts",
        description: "See the gifts waiting for a player",
    },
    {
        path: "/get_visits/tt/",
        label: "Visits",
        description: "See who has visited a tower",
    },
    {
        path: "/friend/pull_meta/tt/",
        label: "Friend metadata",
        description: "Fetch metadata about a player's friends",
    },
    {
        path: "/friend/pull_game/tt/",
        label: "Friend tower",
        description: "Download a friend's tower data",
    },
];

/**
 * Scopes that change game state at Nimblebit. These are never self-serve:
 * the dashboard lists them so people know they exist, and points at the
 * Discord for a manual grant.
 *
 * @since 1.0.0
 * @category Catalog
 */
export const ELEVATED_SCOPES: ReadonlyArray<ScopeDescription> = [
    {
        path: "/sync/push/tt/",
        label: "Push save",
        description: "Upload save data to a tower",
    },
    {
        path: "/sync/push_snapshot/tt/",
        label: "Push snapshot",
        description: "Upload a cloud snapshot",
    },
    {
        path: "/raffle/enter/tt/",
        label: "Enter raffle",
        description: "Enter a player into the raffle",
    },
    {
        path: "/raffle/enter_multi/tt/",
        label: "Enter raffle (multi)",
        description: "Enter a player into multiple raffles",
    },
    {
        path: "/send_item/tt/",
        label: "Send items",
        description: "Send bitizens and items to another player",
    },
    {
        path: "/receive_item/tt/",
        label: "Receive gifts",
        description: "Accept a gift on a player's behalf",
    },
    {
        path: "/register_email/tt/",
        label: "Register email",
        description: "Attach an email address to a player",
    },
    {
        path: "/verify_device/tt/",
        label: "Verify device",
        description: "Complete a device verification code",
    },
];

/** The set of path prefixes a self-service key may carry. */
export const SELF_SERVE_SCOPE_PATHS: ReadonlySet<string> = new Set(SELF_SERVE_SCOPES.map((scope) => scope.path));

/** How many keys one Tinyburg account may hold at a time. */
export const MAX_KEYS_PER_USER = 5;

/** The rate limit a freshly provisioned self-service key starts with. */
export const DEFAULT_RATE_LIMIT = { limit: 10, windowMillis: 60_000 } as const;

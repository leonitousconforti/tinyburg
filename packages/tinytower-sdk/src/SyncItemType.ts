/**
 * The type of sync item.
 *
 * @since 1.0.0
 * @category SyncItem
 */
export const SyncItemType = {
    /** Unused? */
    None: "None",

    /** This is the type for when someone sends you a bitizen, short for player? */
    Play: "Play",

    /** Not sure, haven't seen used. */
    Gift: "Gift",

    /**
     * Sometimes there might be gifts that come out of thin air, like nimblebit
     * might do a giveaway or something.
     */
    Cloud: "Cloud",

    /** A raffle gift. */
    Raffle: "Raffle",

    /** A visit from a friend. */
    Visit: "Visit",

    Leaderboards: "Leaderboards",
} as const;

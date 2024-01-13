export enum SyncItemType {
    /** Unused, just a place holder idk. */
    None = "None",

    /** This is the type for when someone sends you a bitizen, short for player */
    Play = "Play",

    /** Not sure, haven't seen used. */
    Gift = "Gift",

    /**
     * Sometimes there might be gifts that come out of thin air, like nimblebit
     * might do a giveaway or something.
     */
    Cloud = "Cloud",

    /** Raffle gifts. */
    Raffle = "Raffle",

    /** Visit gifts. */
    Visit = "Visit",
}

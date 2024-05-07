/**
 * Base response for all nimblebit api's. Either success or error should
 * contains something, and the proxied hash will be present in any request sent
 * to the auth proxy that requires a hash validation.
 */
export interface INimblebitResponse {
    success?: string;
    error?: string;

    /**
     * If the request was made through the authproxy, then the validation hash
     * will be computed on the authproxy server and the tinyburg client will
     * check that the proxied hash value matches the hash value from nimblebit.
     * This is because the validation hash depends on the secret salt. This
     * property will only be present if the request was sent using the
     * authproxy.
     */
    proxiedHash?: string;
}

/** Adds the found or not found success messages to the base nimblebit response. */
export interface ISuccessFoundNotFound {
    /**
     * Either something was Found or NotFound. The nimblebit servers might not
     * be able to find any saves for the account if the account has not pushed a
     * cloud save. The TinyTower app automatically pushes a save when you login
     * to the cloud for the first time, so NotFound only really applies to
     * burn-bots which have been created outside of the app which do not have
     * any saves pushed.
     */
    success?: "Found" | "NotFound";
}

/**
 * User meta data described, has its own interface because it is used in
 * multiple return types from Nimblebit's apis.
 */
export interface IUserMetaDescribed {
    /**
     * Number of stories/floors, counted the same as they are on the elevator
     * shaft.
     */
    level: number;

    /**
     * Doorman bitizen, shows as avatar in friend list. Can be any valid
     * bitizen.
     */
    avatar: string;

    /** All time number of golden tickets they have. */
    mg: number;

    /**
     * If they are requesting bitizen for a particular floor, this is that floor
     * id. You can lookup the name of the floor using the floor blocks.
     */
    reqFID: number;

    /** Bitbook post? not 100% sure */
    bb: string;

    /** Not sure what the purpose of this is. */
    ts: number;

    /** Indicates that they are vip. */
    vip: boolean;
}

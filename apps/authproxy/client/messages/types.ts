/**
 * One interface per page file, mirroring `pages/*.ts`, plus the document
 * titles and the chrome copy shared by more than one page. Interpolated
 * strings are functions, so word order stays the translator's call.
 *
 * The scope catalog in `shared/scopes.ts` (labels and descriptions of the
 * proxy's endpoint families) is part of the API surface and stays English,
 * like the endpoint paths it names.
 */

/** Document titles, one per route. */
export interface TitleMessages {
    readonly home: string;
    readonly login: string;
    readonly keys: string;
    readonly admin: string;
    readonly notFound: string;
}

/** Chrome copy used by more than one page. */
export interface SharedMessages {
    readonly backToHome: string;
    readonly cancel: string;
    readonly delete: string;
    readonly rateLimit: (limit: number, windowSeconds: number) => string;
    readonly reallyDelete: string;
    readonly reEnable: string;
    readonly revoke: string;
    readonly revokedBadge: string;
}

export interface HomeMessages {
    readonly title: string;
    readonly tagline: string;
    readonly manageKeys: string;
    readonly signIn: string;
    readonly howItWorksHeading: string;
    readonly howItWorksIntro: string;
    readonly howItWorksScopes: string;
    readonly sdkHeading: string;
    /** Wraps the `@tinyburg/tinytower-sdk` link, so it splits around it. */
    readonly sdkIntroBefore: string;
    readonly sdkIntroAfter: string;
    readonly sdkOutro: string;
    readonly testKeysHeading: string;
    readonly testKeysIntro: string;
    readonly testKeysOutro: string;
    /** Wraps the tinyburg.app link, so it splits around it. */
    readonly footerBefore: string;
    readonly footerAfter: string;
}

export interface LoginMessages {
    readonly heading: string;
    readonly subheading: string;
    readonly signInWithTinyburg: string;
    /** Wraps the tinyburg.app/login link, so it splits around it. */
    readonly noAccountBefore: string;
    readonly createAccountLink: string;
    readonly noAccountAfter: string;
    readonly cancelled: string;
    readonly interrupted: string;
    readonly failed: string;
}

export interface KeysMessages {
    readonly heading: string;
    readonly headingFor: (name: string) => string;
    readonly signOut: string;
    readonly sectionHeading: string;
    readonly sectionIntro: string;
    readonly loading: string;
    readonly loadFailed: string;
    readonly emptyState: string;
    readonly newKey: string;
    readonly maxKeysTitle: (maxKeys: number) => string;
    readonly provisionTitle: string;
    readonly copy: string;
    readonly rotate: string;
    readonly rotateTitle: string;
    readonly createdLastUsed: (created: string, lastUsed: string) => string;
    readonly descriptionLabel: string;
    readonly descriptionPlaceholder: string;
    readonly readOnlyScopesLabel: string;
    readonly writeScopesNote: string;
    readonly createKey: string;
    /** Keyed by the notice tags the keys page stores in its model. */
    readonly notices: {
        readonly copied: string;
        readonly created: string;
        readonly rotated: string;
        readonly revoked: string;
        readonly reEnabled: string;
        readonly deleted: string;
    };
    /** Keyed by the problem tags the keys page stores in its model. */
    readonly problems: {
        readonly actionFailed: string;
        readonly createRefused: (maxKeys: number) => string;
        readonly clipboardFailed: string;
    };
}

export interface AdminMessages {
    readonly heading: string;
    readonly yourKeysLink: string;
    readonly stepUpHeading: string;
    readonly stepUpIntro: string;
    readonly passwordPlaceholder: string;
    readonly elevate: string;
    readonly allKeysHeading: string;
    readonly allKeysIntro: string;
    readonly loading: string;
    readonly loadFailed: string;
    readonly emptyState: string;
    readonly owner: (sub: string) => string;
    readonly noOwner: string;
    readonly scopesButton: string;
    readonly rateLimitButton: string;
    readonly saveScopes: string;
    readonly saveLimit: string;
    readonly requestsLabel: string;
    readonly perSecondsLabel: string;
    /** Keyed by the notice tags the admin page stores in its model. */
    readonly notices: {
        readonly saved: string;
        readonly keyDeleted: string;
    };
    /** Keyed by the problem tags the admin page stores in its model. */
    readonly problems: {
        readonly elevationFailed: string;
        readonly actionFailed: string;
        readonly rateLimitInvalid: string;
    };
}

export interface NotFoundMessages {
    readonly heading: string;
    readonly body: string;
}

export interface Messages {
    readonly titles: TitleMessages;
    readonly shared: SharedMessages;
    readonly home: HomeMessages;
    readonly login: LoginMessages;
    readonly keys: KeysMessages;
    readonly admin: AdminMessages;
    readonly notFound: NotFoundMessages;
}

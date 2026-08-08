/**
 * Every user-visible string in the SPA, one interface per page module plus the
 * document titles. Each locale file implements `Messages` in full, so a string
 * added here without a translation is a compile error, not a silent fallback.
 * Interpolated strings are functions of their data.
 *
 * Legal prose (`privacy.ts`) is deliberately excluded and stays English.
 */

export interface TitleMessages {
    readonly home: string;
    readonly login: string;
    readonly towers: string;
    readonly privacy: string;
    readonly notFound: string;
}

export interface HomeMessages {
    readonly title: string;
    readonly tagline: string;
    readonly permissionTitle: string;
    readonly permissionBody: string;
    readonly connectionTitle: string;
    readonly connectionBody: string;
    readonly botTitle: string;
    readonly botBody: string;
    readonly yourTowers: string;
    readonly signIn: string;
    readonly whatYoudShare: string;
}

export interface LoginMessages {
    readonly backToHome: string;
    readonly heading: string;
    readonly intro: string;
    readonly cancelled: string;
    readonly interrupted: string;
    readonly failed: string;
    readonly signInWithTinyburg: string;
    readonly noAccountPrefix: string;
    readonly createAccount: string;
    readonly noAccountSuffix: string;
}

export interface NotFoundMessages {
    readonly heading: string;
    readonly body: string;
    readonly backToLobby: string;
}

export interface TowersMessages {
    // Command and update strings, surfaced in the notice/problem banners.
    readonly loadFailed: string;
    readonly actionFailed: string;
    readonly enrollForbidden: string;
    readonly withdrawNotFound: string;
    readonly enrolledCrawled: string;
    readonly enrolledPending: string;
    readonly withdrawn: (eventsRemoved: number) => string;

    // The per-tower row.
    readonly notReadYet: string;
    readonly lastRead: (date: string) => string;
    readonly inTheStudy: (lastCrawled: string) => string;
    readonly circleSummary: (circleSize: number, totalFriends: number, lastCrawled: string) => string;
    readonly takingPart: string;
    readonly notTakingPart: string;
    readonly joiningShares: string;
    readonly seeMyCircle: string;
    readonly withdrawTitle: string;
    readonly reallyLeave: string;
    readonly leaveAndDelete: string;
    readonly joining: string;
    readonly takePart: string;

    // The expanded circle.
    readonly yourCircle: string;
    readonly hide: string;
    readonly emptyCircle: string;

    // The empty state when no tower is linked.
    readonly noLinkedTowers: string;
    readonly linkingExplains: string;
    readonly linkOne: string;
    readonly thenComeBack: string;

    // The page frame.
    readonly heading: string;
    readonly headingBody: string;
    readonly loading: string;
    readonly yourSocialCircles: string;
    readonly namedSocialCircles: (name: string) => string;
    readonly signOut: string;
    readonly privacyPrefix: string;
    readonly privacyLink: string;
    readonly privacySuffix: string;
}

export interface Messages {
    readonly titles: TitleMessages;
    readonly home: HomeMessages;
    readonly login: LoginMessages;
    readonly notFound: NotFoundMessages;
    readonly towers: TowersMessages;
}

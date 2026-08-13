/**
 * Every piece of user-visible copy the SPA renders, one interface per page
 * plus the document titles and the chrome shared between pages. Each locale
 * module implements `Messages`, so a key missing from any translation is a
 * compile error rather than a blank spot on the page.
 *
 * Interpolated strings are functions of their data; count-bearing strings are
 * functions of the number so each language applies its own plural rules.
 */

/** Copy used by more than one page: back links and the tower floor labels. */
export interface SharedMessages {
    readonly back: string;
    readonly backToHome: string;
    readonly floors: {
        readonly food: string;
        readonly retail: string;
        readonly service: string;
        readonly creative: string;
        readonly recreation: string;
        readonly residential: string;
        readonly lobby: string;
    };
}

/** Document titles, one per route. */
export interface TitleMessages {
    readonly home: string;
    readonly about: string;
    readonly login: string;
    readonly privacy: string;
    readonly terms: string;
    readonly sponsors: string;
    readonly developers: string;
    readonly developerApps: string;
    readonly towerMe: string;
    readonly towerLink: string;
    readonly account: string;
    readonly notFound: string;
}

export interface HomeMessages {
    readonly nav: {
        readonly browseTrades: string;
        readonly bitizens: string;
        readonly costumes: string;
        readonly about: string;
    };
    readonly logIn: string;
    readonly heroTitle: string;
    readonly heroTagline: string;
    readonly startTrading: string;
    readonly learnMore: string;
    readonly featuresHeading: string;
    readonly features: {
        readonly tradeBitizens: { readonly title: string; readonly description: string };
        readonly costumesPets: { readonly title: string; readonly description: string };
        readonly goldenTickets: { readonly title: string; readonly description: string };
        readonly community: { readonly title: string; readonly description: string };
    };
    readonly stats: {
        readonly activeTraders: string;
        readonly tradesCompleted: string;
        readonly bitizensTraded: string;
    };
    readonly ctaHeading: string;
    readonly ctaBody: string;
    readonly ctaButton: string;
    readonly footerAbout: { readonly before: string; readonly linkLabel: string; readonly after: string };
    readonly quickLinks: string;
    readonly community: string;
    readonly legal: string;
    readonly sponsors: string;
    readonly privacyPolicy: string;
    readonly termsOfService: string;
    readonly copyright: string;
}

export interface AboutMessages {
    readonly title: string;
    readonly tagline: string;
    readonly whatIsHeading: string;
    readonly whatIsBody: string;
    readonly missionHeading: string;
    readonly missions: {
        readonly findDreamJobbers: { readonly title: string; readonly description: string };
        readonly connectPlayers: { readonly title: string; readonly description: string };
        readonly collectEverything: { readonly title: string; readonly description: string };
    };
    readonly howHeading: string;
    readonly steps: {
        readonly signUp: { readonly title: string; readonly description: string };
        readonly linkTower: { readonly title: string; readonly description: string };
        readonly browseTrade: { readonly title: string; readonly description: string };
        readonly buildDream: { readonly title: string; readonly description: string };
    };
    readonly communityHeading: string;
    readonly communityBody: string;
    readonly joinDiscord: string;
    readonly openSourceHeading: string;
    readonly openSourceBody: string;
    readonly viewOnGithub: string;
    readonly ourSponsors: string;
    readonly faqHeading: string;
    readonly faqs: {
        readonly free: { readonly question: string; readonly answer: string };
        readonly affiliated: { readonly question: string; readonly answer: string };
        readonly trades: { readonly question: string; readonly answer: string };
        readonly dataSafe: {
            readonly question: string;
            readonly before: string;
            readonly linkLabel: string;
            readonly after: string;
        };
    };
}

export interface LoginMessages {
    readonly heading: string;
    readonly subheading: string;
    readonly problems: {
        readonly denied: string;
        readonly expired: string;
        readonly failed: string;
    };
    readonly continueWithGoogle: string;
    readonly continueWithDiscord: string;
    readonly perks: {
        readonly dreamJobs: string;
        readonly trade: string;
        readonly collect: string;
    };
    readonly agreeBefore: string;
    readonly termsOfService: string;
    readonly agreeAnd: string;
    readonly privacyPolicy: string;
}

export interface AccountMessages {
    readonly backToTowers: string;
    readonly heading: (name: string) => string;
    readonly notices: {
        readonly connected: string;
        readonly alreadyConnected: string;
        readonly disconnected: string;
        readonly linkCancelled: string;
    };
    readonly signedOutSessions: (count: number) => string;
    readonly problems: {
        readonly linkExpired: string;
        readonly linkFailed: string;
        readonly accountTaken: string;
        readonly actionFailed: string;
        readonly lastSignInMethod: string;
    };
    readonly loadFailed: string;
    readonly sessionsHeading: string;
    readonly sessionsBody: string;
    readonly loadingSessions: string;
    readonly unknownDevice: string;
    readonly deviceOn: (browser: string, platform: string) => string;
    readonly thisDevice: string;
    readonly lastActive: (when: string) => string;
    readonly signedInOn: (date: string) => string;
    readonly signOut: string;
    readonly signOutThisBrowser: string;
    readonly signOutOf: (name: string) => string;
    readonly noOtherSessions: string;
    readonly signOutOthers: (count: number) => string;
    readonly signOutEverywhere: string;
    readonly methodsHeading: string;
    readonly methodsBody: string;
    readonly loading: string;
    readonly disconnect: string;
    readonly disconnectProvider: (provider: string) => string;
    readonly lastMethodTitle: string;
    readonly connect: string;
}

export interface DevelopersMessages {
    readonly title: string;
    readonly tagline: string;
    readonly signInHeading: string;
    readonly signInBody: string;
    readonly features: {
        readonly standardOidc: { readonly title: string; readonly description: string };
        readonly minimalScopes: { readonly title: string; readonly description: string };
        readonly playerConsent: { readonly title: string; readonly description: string };
    };
    readonly gettingStartedHeading: string;
    readonly steps: {
        readonly logIn: { readonly title: string; readonly description: string };
        readonly register: { readonly title: string; readonly description: string };
        readonly point: { readonly title: string; readonly description: string };
        readonly signIn: { readonly title: string; readonly description: string };
    };
    readonly redirectNote: string;
    readonly endpointsHeading: string;
    readonly endpointsBody: string;
    readonly endpointNames: {
        readonly jwks: string;
        readonly discovery: string;
        readonly authorization: string;
        readonly token: string;
        readonly userinfo: string;
    };
    readonly scopesHeading: string;
    readonly scopeDescriptions: {
        readonly openid: string;
        readonly profile: string;
    };
    readonly readyHeading: string;
    readonly readyBefore: string;
    readonly discordLinkLabel: string;
    readonly readyAfter: string;
    readonly yourApplications: string;
    readonly discoveryDocument: string;
}

export interface DeveloperAppsMessages {
    readonly heading: string;
    readonly comingSoon: string;
    readonly comingSoonDetail: string;
    readonly readGuide: string;
}

export interface SponsorsMessages {
    readonly title: string;
    readonly tagline: string;
    readonly intro: string;
    readonly becomeSponsor: string;
    readonly currentHeading: string;
    readonly noSponsors: string;
    readonly pastHeading: string;
    readonly pastBody: string;
    readonly otherWaysHeading: string;
    readonly otherWaysBody: string;
    readonly starOnGithub: string;
    readonly joinDiscord: string;
}

export interface TowerLinkMessages {
    readonly backToTowers: string;
    readonly heading: string;
    readonly subheading: string;
    readonly step1: string;
    readonly step2: string;
    readonly friendCodeLabel: string;
    readonly friendCodeTitle: string;
    readonly friendCodeHint: string;
    readonly emailLabel: string;
    readonly emailHint: string;
    readonly sending: string;
    readonly sendCode: string;
    readonly sentCodeBefore: string;
    readonly sentCodeAfter: string;
    readonly codeLabel: string;
    readonly codeHint: string;
    readonly linked: string;
    readonly verifying: string;
    readonly linkMyTower: string;
    readonly goBack: string;
    readonly sent: string;
    readonly resend: string;
    readonly errors: {
        readonly requestFailed: string;
        readonly verifyFailed: string;
        readonly resendFailed: string;
    };
}

export interface TowerMeMessages {
    readonly avatarAlt: (name: string) => string;
    readonly mayor: string;
    readonly signOut: string;
    readonly towersHeading: string;
    readonly linkATower: string;
    readonly noTowers: string;
    readonly noTowersDetailLong: string;
    readonly noTowersDetailShort: string;
    readonly loadingTowers: string;
    readonly towersLoadFailed: string;
    readonly linkedOn: (date: string) => string;
    readonly accountRow: { readonly title: string; readonly detail: string };
    readonly developerRow: { readonly title: string; readonly detail: string };
}

export interface NotFoundMessages {
    readonly heading: string;
    readonly body: string;
    readonly goHome: string;
    readonly goBack: string;
}

export interface Messages {
    readonly shared: SharedMessages;
    readonly titles: TitleMessages;
    readonly home: HomeMessages;
    readonly about: AboutMessages;
    readonly login: LoginMessages;
    readonly account: AccountMessages;
    readonly developers: DevelopersMessages;
    readonly developerApps: DeveloperAppsMessages;
    readonly sponsors: SponsorsMessages;
    readonly towerLink: TowerLinkMessages;
    readonly towerMe: TowerMeMessages;
    readonly notFound: NotFoundMessages;
}

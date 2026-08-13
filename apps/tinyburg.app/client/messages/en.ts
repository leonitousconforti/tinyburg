import type { Messages } from "./types.ts";

/** English: the source copy, moved verbatim from the pages. */
export const en: Messages = {
    shared: {
        back: "Back",
        backToHome: "← Back to Home",
        floors: {
            food: "🍕 Food",
            retail: "🛍️ Retail",
            service: "✂️ Service",
            creative: "🎨 Creative",
            recreation: "🎮 Recreation",
            residential: "🛏️ Residential",
            lobby: "🚪 Lobby",
        },
    },
    titles: {
        home: "TinyTower Trading | Trade Bitizens, Costumes & More",
        about: "About | Tinyburg",
        login: "Log In | Tinyburg",
        privacy: "Privacy Policy | Tinyburg",
        terms: "Terms of Service | Tinyburg",
        sponsors: "Sponsors | Tinyburg",
        developers: "Developers | Tinyburg",
        developerApps: "OAuth Applications | Tinyburg",
        towerMe: "My Towers | Tinyburg",
        towerLink: "Link Your Tower | Tinyburg",
        account: "Account & Security | Tinyburg",
        notFound: "Page Not Found | Tinyburg",
    },
    home: {
        nav: {
            browseTrades: "Browse Trades",
            bitizens: "Bitizens",
            costumes: "Costumes",
            about: "About",
        },
        logIn: "Log In",
        heroTitle: "TinyTower Trading",
        heroTagline:
            "The community marketplace for trading bitizens, costumes, pets, and more with TinyTower players worldwide",
        startTrading: "Start Trading",
        learnMore: "Learn More",
        featuresHeading: "What Can You Trade?",
        features: {
            tradeBitizens: {
                title: "Trade Bitizens",
                description: "Find dream jobbers for your tower or trade away duplicates",
            },
            costumesPets: {
                title: "Costumes & Pets",
                description: "Collect rare costumes and adorable pets for your bitizens",
            },
            goldenTickets: {
                title: "Golden Tickets",
                description: "Exchange resources and help fellow tower builders",
            },
            community: {
                title: "Community",
                description: "Connect with thousands of active TinyTower players",
            },
        },
        stats: {
            activeTraders: "Active Traders",
            tradesCompleted: "Trades Completed",
            bitizensTraded: "Bitizens Traded",
        },
        ctaHeading: "Ready to Build Your Dream Tower?",
        ctaBody: "Join thousands of players trading bitizens and items every day",
        ctaButton: "Get Started Free",
        footerAbout: {
            before: "A community-driven trading platform for TinyTower enthusiasts. Not affiliated with NimbleBit. Source code is available on ",
            linkLabel: "GitHub",
            after: "",
        },
        quickLinks: "Quick Links",
        community: "Community",
        legal: "Legal",
        sponsors: "Sponsors",
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
        copyright: "© 2026 Tinyburg. TinyTower is a trademark of NimbleBit LLC.",
    },
    about: {
        title: "About Tinyburg",
        tagline: "Building connections, one bitizen at a time",
        whatIsHeading: "What is Tinyburg?",
        whatIsBody:
            "Tinyburg is a community-made trading platform built by TinyTower enthusiasts. We make it easy to find dream job bitizens, trade rare costumes, and connect with fellow tower builders from around the world.",
        missionHeading: "Our Mission",
        missions: {
            findDreamJobbers: {
                title: "Find Dream Jobbers",
                description:
                    "Stop waiting for random bitizens. Search our database to find the perfect 9-skill dream jobbers for your floors.",
            },
            connectPlayers: {
                title: "Connect Players",
                description:
                    "Building a tower is more fun together. Connect with thousands of active players ready to trade and help each other out.",
            },
            collectEverything: {
                title: "Collect Everything",
                description: "From rare costumes to adorable pets, trade your way to completing your collection.",
            },
        },
        howHeading: "How It Works",
        steps: {
            signUp: {
                title: "Sign Up",
                description: "Create your account using Google or Discord in seconds",
            },
            linkTower: {
                title: "Link Your Tower",
                description: "Use Nimblebit's cloud sync feature to link your tower",
            },
            browseTrade: {
                title: "Browse & Trade",
                description: "Find what you need and connect with other players",
            },
            buildDream: {
                title: "Build Your Dream Tower",
                description: "Fill every floor with dream jobbers and rare items",
            },
        },
        communityHeading: "Community First",
        communityBody:
            "Tinyburg is built and maintained by passionate TinyTower players. We're not affiliated with NimbleBit, but we share their love for tiny pixels and tall towers. Our goal is to make the TinyTower community even more connected and helpful.",
        joinDiscord: "Join our Discord",
        openSourceHeading: "Open Source",
        openSourceBody:
            "Tinyburg is an open source project. We believe in transparency and community contribution. Check out our code, report bugs, or contribute features on GitHub.",
        viewOnGithub: "View on GitHub",
        ourSponsors: "Our Sponsors",
        faqHeading: "Frequently Asked Questions",
        faqs: {
            free: {
                question: "Q: Is Tinyburg free?",
                answer: "A: Yes! Tinyburg is completely free to use. We're a community project built by players who love the game.",
            },
            affiliated: {
                question: "Q: Is this affiliated with NimbleBit?",
                answer: "A: No, Tinyburg is an independent fan project. We're not affiliated with, endorsed by, or connected to NimbleBit LLC in any way.",
            },
            trades: {
                question: "Q: How do trades work?",
                answer: "A: Tinyburg helps you find traders and coordinate exchanges. The actual trading can leverage a couple different methods to exchange the items depending on what the items are, such as sending gifts or modifying save data.",
            },
            dataSafe: {
                question: "Is my data safe?",
                before: "We only collect what's necessary to provide the service. Check our ",
                linkLabel: "Privacy Policy",
                after: " for full details.",
            },
        },
    },
    login: {
        heading: "Welcome to Tinyburg",
        subheading: "Sign in or create an account to get started",
        problems: {
            denied: "Sign in was cancelled. You can pick up where you left off whenever you like.",
            expired:
                "That sign in attempt expired or was interrupted. Please start again, and check that your browser allows cookies for this site.",
            failed: "We couldn't finish signing you in. Please try again.",
        },
        continueWithGoogle: "Continue with Google",
        continueWithDiscord: "Continue with Discord",
        perks: {
            dreamJobs: "Find dream job bitizens",
            trade: "Trade with thousands of players",
            collect: "Collect rare costumes & pets",
        },
        agreeBefore: "By continuing, you agree to our ",
        termsOfService: "Terms of Service",
        agreeAnd: " and ",
        privacyPolicy: "Privacy Policy",
    },
    account: {
        backToTowers: "← Back to My Towers",
        heading: (name) => `${name}'s account`,
        notices: {
            connected: "Connected. You can now sign in with it.",
            alreadyConnected: "That account was already connected.",
            disconnected: "Disconnected.",
            linkCancelled: "Connecting that account was cancelled.",
        },
        signedOutSessions: (count) => (count === 1 ? "Signed out of 1 session." : `Signed out of ${count} sessions.`),
        problems: {
            linkExpired: "That attempt expired or was interrupted. Please try connecting again.",
            linkFailed: "We couldn't connect that account. Please try again.",
            accountTaken: "That account is already connected to a different Tinyburg account.",
            actionFailed: "That didn't work. Please try again.",
            lastSignInMethod: "That's your only way to sign in, so it has to stay connected.",
        },
        loadFailed: "We couldn't load this. Please try again.",
        sessionsHeading: "Where You're Signed In",
        sessionsBody: "Every browser holding a session for this account. Sign out of any you don't recognise.",
        loadingSessions: "Loading your sessions...",
        unknownDevice: "Unknown device",
        deviceOn: (browser, platform) => `${browser} on ${platform}`,
        thisDevice: "This device",
        lastActive: (when) => `Last active ${when}`,
        signedInOn: (date) => `Signed in ${date}`,
        signOut: "Sign out",
        signOutThisBrowser: "Sign out of this browser",
        signOutOf: (name) => `Sign out of ${name}`,
        noOtherSessions: "No other sessions",
        signOutOthers: (count) => (count === 1 ? "Sign out 1 other session" : `Sign out ${count} other sessions`),
        signOutEverywhere: "Sign out everywhere",
        methodsHeading: "Sign-In Methods",
        methodsBody: "Connect more ways to sign in, so you can always get back to this account.",
        loading: "Loading...",
        disconnect: "Disconnect",
        disconnectProvider: (provider) => `Disconnect ${provider}`,
        lastMethodTitle: "This is the only way you have left to sign in",
        connect: "Connect →",
    },
    developers: {
        title: "Tinyburg for Developers",
        tagline: "Let players bring their Tinyburg account to your app",
        signInHeading: "Sign in with Tinyburg",
        signInBody:
            "Tinyburg is an OpenID Connect provider. Building a companion tool, a Discord bot dashboard, or anything else for the TinyTower community? Register an OAuth application and players can sign in to it with the same account they use to trade, no new passwords required.",
        features: {
            standardOidc: {
                title: "Standard OIDC",
                description:
                    "Authorization code flow with PKCE and ES256-signed id tokens. Any OpenID Connect client library works out of the box.",
            },
            minimalScopes: {
                title: "Minimal Scopes",
                description:
                    "Apps only see a player's identity, display name, and avatar. Nothing else leaves Tinyburg.",
            },
            playerConsent: {
                title: "Player Consent",
                description:
                    "Players approve exactly what your app can see on a consent screen before any tokens are issued.",
            },
        },
        gettingStartedHeading: "Getting Started",
        steps: {
            logIn: {
                title: "Log In to Tinyburg",
                description: "You need a Tinyburg account to register applications",
            },
            register: {
                title: "Register Your Application",
                description: "Give it a name and your redirect uris, then grab your client id and secret",
            },
            point: {
                title: "Point Your OIDC Library at Us",
                description: "Most libraries only need the discovery url below to configure themselves",
            },
            signIn: {
                title: "Players Sign In",
                description: "They approve your app once and arrive back at your redirect uri",
            },
        },
        redirectNote:
            "Redirect uris must use https, except for localhost while you develop. Client secrets are shown once at registration and stored hashed, so keep yours somewhere safe.",
        endpointsHeading: "Endpoints",
        endpointsBody:
            "Everything below is also published in the discovery document, so most setups only ever need the first url.",
        endpointNames: {
            jwks: "JWKS",
            discovery: "Discovery",
            authorization: "Authorization",
            token: "Token",
            userinfo: "Userinfo",
        },
        scopesHeading: "Scopes",
        scopeDescriptions: {
            openid: "Confirm your Tinyburg identity",
            profile: "See your display name and avatar",
        },
        readyHeading: "Ready to Build?",
        readyBefore:
            "Register your first application and start signing players in. Questions or stuck on something? Ask in the ",
        discordLinkLabel: "Tinyburg Discord",
        readyAfter: " and we'll help you out.",
        yourApplications: "Your Applications",
        discoveryDocument: "Discovery Document",
    },
    developerApps: {
        heading: "OAuth Applications",
        comingSoon: "Self-serve registration is coming",
        comingSoonDetail:
            "Sign in with Tinyburg already works. Ask in the Discord and we'll register your application by hand in the meantime.",
        readGuide: "← Read the integration guide",
    },
    sponsors: {
        title: "Thank You, Sponsors!",
        tagline: "The people keeping the lights on in every floor",
        intro: "Tinyburg is free, open source, and run by volunteers. The servers, the database, and the treasury that escrows every trade are all paid for by the generous people on this page who sponsor the project on GitHub. Every single one of them makes the tower a little taller.",
        becomeSponsor: "Become a Sponsor",
        currentHeading: "Current Sponsors",
        noSponsors: "No sponsors yet. Be the first bitizen on this floor!",
        pastHeading: "Past Sponsors",
        pastBody: "Once a sponsor, always appreciated. Thank you for helping along the way!",
        otherWaysHeading: "Other Ways to Help",
        otherWaysBody:
            "Sponsoring is not the only way to support Tinyburg. Report bugs, contribute a feature, or just hang out and help other tower builders in the community.",
        starOnGithub: "Star on GitHub",
        joinDiscord: "Join our Discord",
    },
    towerLink: {
        backToTowers: "← My Towers",
        heading: "Link Your Tower",
        subheading: "Connect your TinyTower cloud save to start trading with players worldwide",
        step1: "Step 1 of 2",
        step2: "Step 2 of 2",
        friendCodeLabel: "Friend Code",
        friendCodeTitle: "Up to 5 letters or numbers",
        friendCodeHint: "You can find it on the Friends tab in TinyTower",
        emailLabel: "Cloud Sync Email",
        emailHint: "The email your cloud save is registered with. Nimblebit will send a verification code to it.",
        sending: "Sending...",
        sendCode: "Send Verification Code",
        sentCodeBefore: "📬 Nimblebit sent a verification code to ",
        sentCodeAfter: ". It can take a minute to arrive.",
        codeLabel: "Verification Code",
        codeHint: "No email? Check your spam folder",
        linked: "Linked! Redirecting...",
        verifying: "Verifying...",
        linkMyTower: "Link My Tower",
        goBack: "← Go back",
        sent: "Sent!",
        resend: "Resend email",
        errors: {
            requestFailed: "We couldn't reach your tower. Please double-check your friend code and try again.",
            verifyFailed: "That code didn't work. Please check it and try again, or resend the email.",
            resendFailed: "We couldn't resend the email. Please try again in a moment.",
        },
    },
    towerMe: {
        avatarAlt: (name) => `Avatar for ${name}`,
        mayor: "🏙️ Mayor of Tinyburg",
        signOut: "Sign Out",
        towersHeading: "My Towers",
        linkATower: "+ Link a Tower",
        noTowers: "No towers linked yet",
        noTowersDetailLong: "Link your TinyTower save to sync your bitizens and start trading with players worldwide.",
        noTowersDetailShort: "Link your TinyTower save to start trading.",
        loadingTowers: "Loading your towers...",
        towersLoadFailed: "We couldn't load your towers. Please try again.",
        linkedOn: (date) => `Linked ${date}`,
        accountRow: {
            title: "Account & Security",
            detail: "Manage where you're signed in and how you sign in",
        },
        developerRow: {
            title: "Developer Portal",
            detail: "Register OAuth apps that sign users in with Tinyburg",
        },
    },
    notFound: {
        heading: "Floor Not Found",
        body: "Maybe the bitizens moved this floor? Try the lobby instead!",
        goHome: "Go Home",
        goBack: "Go Back",
    },
};

/**
 * English. The source copy, moved verbatim from the page modules; the other
 * locales translate from here. Glossary kept as-is everywhere: Tinyburg,
 * TinyTower, tinyburg.app, Social Circles (the study's name).
 */

import type { Messages } from "./types.ts";

export const en: Messages = {
    titles: {
        home: "TinyTower Social Circles | An Opt-In Friend Network Study",
        login: "Sign In | Social Circles",
        towers: "Your Towers | Social Circles",
        privacy: "What You'd Be Sharing | Social Circles",
        notFound: "Page Not Found | Social Circles",
    },

    home: {
        title: "TinyTower Social Circles",
        tagline: "An opt-in study of how TinyTower players are connected.",
        permissionTitle: "Nothing without permission",
        permissionBody:
            "Your friends list is never read until you sign in and say yes, for that specific tower. You can stop and erase everything at any time.",
        connectionTitle: "A connection needs both people",
        connectionBody:
            "We only record a friendship when both players have joined. If your friend hasn't, that connection is never stored, not even as a hint.",
        botTitle: "No need to friend a bot",
        botBody:
            'Older versions of this study needed you to add a bot account. That\'s gone. Permission travels through your Tinyburg account instead, so you can leave "Only Friend Visits" switched on.',
        yourTowers: "Your towers →",
        signIn: "Sign in with Tinyburg",
        whatYoudShare: "What you'd be sharing",
    },

    login: {
        backToHome: "← Back to Home",
        heading: "Social Circles",
        intro: "Signing in is how we know a tower is really yours. Nothing is collected until you say so, tower by tower.",
        cancelled: "Sign in was cancelled. Nothing was shared, and you can pick this up whenever you like.",
        interrupted:
            "That sign in attempt expired or was interrupted. Please start again, and check that your browser allows cookies for this site.",
        failed: "We couldn't finish signing you in. Please try again.",
        signInWithTinyburg: "Sign in with Tinyburg",
        noAccountPrefix: "No Tinyburg account yet? ",
        createAccount: "Create one at tinyburg.app",
        noAccountSuffix: " first.",
    },

    notFound: {
        heading: "Page Not Found",
        body: "There's no floor at this address.",
        backToLobby: "Back to the lobby",
    },

    towers: {
        loadFailed:
            "We couldn't reach tinyburg.app to check which towers you own. Try signing in again, and if it keeps happening the provider may be down.",
        actionFailed: "That didn't work. Please try again.",
        enrollForbidden:
            "tinyburg.app could not confirm you own that tower. Make sure it is still linked to your Tinyburg account.",
        withdrawNotFound: "That tower is not taking part, so there was nothing to remove.",
        enrolledCrawled: "You're taking part. Your circle is below.",
        enrolledPending:
            "You're taking part. We couldn't read your tower just now, so your circle will appear after the next scheduled pass.",
        withdrawn: (eventsRemoved) =>
            `Removed. ${eventsRemoved} record${eventsRemoved === 1 ? "" : "s"} about you were deleted, and you are no longer in the study.`,

        notReadYet: "not read yet",
        lastRead: (date) => `last read ${date}`,
        inTheStudy: (lastCrawled) => `In the study · ${lastCrawled}`,
        circleSummary: (circleSize, totalFriends, lastCrawled) =>
            `${circleSize} of your ${totalFriends} friends are also taking part · ${lastCrawled}`,
        takingPart: "Taking part",
        notTakingPart: "Not taking part",
        joiningShares:
            "Joining shares only your friends list, and only connections where the other person has joined too.",
        seeMyCircle: "See my circle",
        withdrawTitle: "Withdraw and delete everything the study holds about this tower",
        reallyLeave: "Really leave and delete?",
        leaveAndDelete: "Leave and delete my data",
        joining: "Joining...",
        takePart: "Take part",

        yourCircle: "Your circle",
        hide: "Hide",
        emptyCircle:
            "Nobody in your friends list has joined yet. A connection only appears once both people are taking part.",

        noLinkedTowers: "You haven't linked a TinyTower account to your Tinyburg account yet.",
        linkingExplains: "Linking is how we know a tower is really yours. ",
        linkOne: "Link one at tinyburg.app",
        thenComeBack: ", then come back.",

        heading: "Your Towers",
        headingBody:
            "Each tower decides for itself. Taking part shares that tower's friends list; leaving erases everything the study holds about it.",
        loading: "Loading your towers...",
        yourSocialCircles: "Your social circles",
        namedSocialCircles: (name) => `${name}'s social circles`,
        signOut: "Sign out",
        privacyPrefix: "What we collect and why is written out on the ",
        privacyLink: "privacy page",
        privacySuffix: ".",
    },
};

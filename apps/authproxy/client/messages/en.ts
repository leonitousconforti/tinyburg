/**
 * English messages, moved verbatim from the pages. The explicit `: Messages`
 * annotation is what turns a missing key in any locale into a compile error.
 */

import type { Messages } from "./types.ts";

export const en: Messages = {
    titles: {
        home: "Tinyburg Authproxy | API Keys for Nimblebit's Servers",
        login: "Sign In | Tinyburg Authproxy",
        keys: "Your API Keys | Tinyburg Authproxy",
        admin: "Admin | Tinyburg Authproxy",
        notFound: "Page Not Found | Tinyburg Authproxy",
    },
    shared: {
        backToHome: "← Back to Home",
        cancel: "Cancel",
        delete: "Delete",
        rateLimit: (limit, windowSeconds) => `${limit} requests / ${windowSeconds}s`,
        reallyDelete: "Really delete?",
        reEnable: "Re-enable",
        revoke: "Revoke",
        revokedBadge: "Revoked",
    },
    home: {
        title: "Tinyburg Authproxy",
        tagline: "Authenticated, rate-limited access to Nimblebit's TinyTower servers.",
        manageKeys: "Manage your API keys →",
        signIn: "Sign in with Tinyburg →",
        howItWorksHeading: "How it works",
        howItWorksIntro:
            "The proxy signs your requests before forwarding them to Nimblebit, so you never touch salts or hashes. Authenticate with an API key as a bearer token:",
        howItWorksScopes:
            "A key carries scopes, one per endpoint family, and its own rate limit. Sign in with your Tinyburg account to provision read-only keys yourself, see the keys you hold, and rotate any that leak.",
        sdkHeading: "Use the SDK",
        sdkIntroBefore: "This proxy serves the same endpoint definitions that ",
        sdkIntroAfter:
            " is built from, so a typed TypeScript client comes for free. It decodes save data, friends, gifts, visits and raffles into real types, and it already knows how to aim itself here:",
        sdkOutro:
            "AUTH_KEY is the proxy key you provisioned here; PLAYER_ID and PLAYER_AUTH_KEY name the tower you are acting as. Pulled saves come back as gzipped Nimblebit soup — hand them to the SDK's SaveData schema and you get floors, bitizens, missions and friends as ordinary typed values.",
        testKeysHeading: "Public test keys",
        testKeysIntro: "Two shared keys exist for kicking the tires. They are rate limited by IP address:",
        testKeysOutro:
            "Personal keys are rate limited per key instead, and start at 10 requests a minute. Need write scopes or a higher limit? Reach out on Discord.",
        footerBefore: "Part of ",
        footerAfter: " — not affiliated with Nimblebit.",
    },
    login: {
        heading: "Authproxy Self Service",
        subheading: "Your Tinyburg account is your identity here — one sign in, no new password.",
        signInWithTinyburg: "Sign in with Tinyburg",
        noAccountBefore: "No Tinyburg account yet? ",
        createAccountLink: "Create one at tinyburg.app",
        noAccountAfter: " first.",
        cancelled: "Sign in was cancelled. You can pick up where you left off whenever you like.",
        interrupted:
            "That sign in attempt expired or was interrupted. Please start again, and check that your browser allows cookies for this site.",
        failed: "We couldn't finish signing you in. Please try again.",
    },
    keys: {
        heading: "Your API keys",
        headingFor: (name) => `${name}'s API keys`,
        signOut: "Sign out",
        sectionHeading: "Your API Keys",
        sectionIntro: "Rotate any key you may have leaked, and delete the ones you no longer use.",
        loading: "Loading your keys...",
        loadFailed: "We couldn't load your keys. Please try again.",
        emptyState: "No keys yet. Create one and start calling the proxy.",
        newKey: "+ New key",
        maxKeysTitle: (maxKeys) => `Each account may hold at most ${maxKeys} keys`,
        provisionTitle: "Provision a new key",
        copy: "Copy",
        rotate: "Rotate",
        rotateTitle: "Mint a new key for this row; the old key stops working immediately",
        createdLastUsed: (created, lastUsed) => `Created ${created} · Last used ${lastUsed}`,
        descriptionLabel: "What is this key for?",
        descriptionPlaceholder: "Optional description, e.g. my tower stats bot",
        readOnlyScopesLabel: "Read-only scopes (pick at least one)",
        writeScopesNote: "Write scopes are granted by hand — reach out on Discord",
        createKey: "Create key",
        notices: {
            copied: "Copied to your clipboard.",
            created: "Key created. It works immediately.",
            rotated: "Key rotated. The old key stopped working the moment the new one was minted.",
            revoked: "Key revoked. Requests with it now fail.",
            reEnabled: "Key re-enabled.",
            deleted: "Key deleted.",
        },
        problems: {
            actionFailed: "That didn't work. Please try again.",
            createRefused: (maxKeys) =>
                `That request was refused. Keys need at least one scope, and each account may hold at most ${maxKeys} keys.`,
            clipboardFailed: "We couldn't reach your clipboard. Please try again.",
        },
    },
    admin: {
        heading: "Admin",
        yourKeysLink: "Your keys",
        stepUpHeading: "Step Up",
        stepUpIntro:
            "Admin actions need more than a session: you enter the admin password, then re-authorize with Tinyburg so the proxy can check - with your consent - that your account holds an allowlisted tower. Elevation lasts an hour.",
        passwordPlaceholder: "Admin password",
        elevate: "Elevate with Tinyburg",
        allKeysHeading: "All Keys",
        allKeysIntro: "Every key the proxy has issued, whoever holds it. Write scopes are granted here.",
        loading: "Loading...",
        loadFailed: "We couldn't load the keys. Please try again.",
        emptyState: "No keys exist yet.",
        owner: (sub) => `Owner ${sub}`,
        noOwner: "No owner (admin-issued)",
        scopesButton: "Scopes",
        rateLimitButton: "Rate limit",
        saveScopes: "Save scopes",
        saveLimit: "Save limit",
        requestsLabel: "Requests",
        perSecondsLabel: "per seconds",
        notices: {
            saved: "Saved.",
            keyDeleted: "Key deleted.",
        },
        problems: {
            elevationFailed:
                "Elevation was refused. Check the password, that you approved the tower check, and that your account holds an allowlisted tower.",
            actionFailed: "That didn't work. Please try again.",
            rateLimitInvalid: "Rate limits need positive whole numbers.",
        },
    },
    notFound: {
        heading: "404",
        body: "This floor hasn't been built yet.",
    },
};

/**
 * German, formal register ("Sie") throughout. Kept in English: Tinyburg,
 * TinyTower, tinyburg.app, Social Circles (the study's name), and the in-game
 * setting name "Only Friend Visits". Ordinary words like towers, floors and
 * friends translate normally.
 */

import type { Messages } from "./types.ts";

export const de: Messages = {
    titles: {
        // REVIEW: subtitle phrasing for "An Opt-In Friend Network Study".
        home: "TinyTower Social Circles | Eine Opt-in-Studie zum Freundesnetzwerk",
        login: "Anmelden | Social Circles",
        towers: "Ihre Türme | Social Circles",
        privacy: "Was Sie teilen würden | Social Circles",
        notFound: "Seite nicht gefunden | Social Circles",
    },

    home: {
        title: "TinyTower Social Circles",
        tagline: "Eine Opt-in-Studie darüber, wie TinyTower-Spieler miteinander verbunden sind.",
        permissionTitle: "Nichts ohne Erlaubnis",
        permissionBody:
            "Ihre Freundesliste wird erst gelesen, wenn Sie sich anmelden und zustimmen, und zwar für genau diesen Turm. Sie können jederzeit aufhören und alles löschen.",
        connectionTitle: "Eine Verbindung braucht beide Seiten",
        connectionBody:
            "Wir speichern eine Freundschaft nur, wenn beide Spieler teilnehmen. Wenn Ihr Freund nicht dabei ist, wird diese Verbindung nie gespeichert, nicht einmal als Hinweis.",
        botTitle: "Kein Bot als Freund nötig",
        // REVIEW: "Only Friend Visits" kept in English; the game may localize it.
        botBody:
            'Ältere Versionen dieser Studie verlangten, ein Bot-Konto als Freund hinzuzufügen. Das ist vorbei. Die Erlaubnis läuft stattdessen über Ihr Tinyburg-Konto, Sie können "Only Friend Visits" also eingeschaltet lassen.',
        yourTowers: "Ihre Türme →",
        signIn: "Mit Tinyburg anmelden",
        whatYoudShare: "Was Sie teilen würden",
    },

    login: {
        backToHome: "← Zurück zur Startseite",
        heading: "Social Circles",
        intro: "Über die Anmeldung wissen wir, dass ein Turm wirklich Ihnen gehört. Es wird nichts erhoben, bis Sie zustimmen, Turm für Turm.",
        cancelled: "Die Anmeldung wurde abgebrochen. Es wurde nichts geteilt, und Sie können jederzeit fortfahren.",
        interrupted:
            "Dieser Anmeldeversuch ist abgelaufen oder wurde unterbrochen. Bitte beginnen Sie erneut und prüfen Sie, ob Ihr Browser Cookies für diese Seite zulässt.",
        failed: "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
        signInWithTinyburg: "Mit Tinyburg anmelden",
        noAccountPrefix: "Noch kein Tinyburg-Konto? ",
        createAccount: "Erstellen Sie zuerst eines auf tinyburg.app",
        noAccountSuffix: ".",
    },

    notFound: {
        heading: "Seite nicht gefunden",
        body: "Unter dieser Adresse gibt es kein Stockwerk.",
        backToLobby: "Zurück zur Lobby",
    },

    towers: {
        loadFailed:
            "Wir konnten tinyburg.app nicht erreichen, um zu prüfen, welche Türme Ihnen gehören. Melden Sie sich erneut an; wenn es weiter passiert, ist der Anbieter womöglich nicht erreichbar.",
        actionFailed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
        enrollForbidden:
            "tinyburg.app konnte nicht bestätigen, dass dieser Turm Ihnen gehört. Prüfen Sie, ob er noch mit Ihrem Tinyburg-Konto verknüpft ist.",
        withdrawNotFound: "Dieser Turm nimmt nicht teil, es gab also nichts zu entfernen.",
        enrolledCrawled: "Sie nehmen teil. Ihr Kreis steht unten.",
        enrolledPending:
            "Sie nehmen teil. Wir konnten Ihren Turm gerade nicht lesen, Ihr Kreis erscheint daher nach dem nächsten planmäßigen Durchlauf.",
        withdrawn: (eventsRemoved) =>
            `Entfernt. ${eventsRemoved} ${eventsRemoved === 1 ? "Eintrag über Sie wurde" : "Einträge über Sie wurden"} gelöscht, und Sie nehmen nicht mehr an der Studie teil.`,

        notReadYet: "noch nicht gelesen",
        lastRead: (date) => `zuletzt gelesen am ${date}`,
        inTheStudy: (lastCrawled) => `In der Studie · ${lastCrawled}`,
        circleSummary: (circleSize, totalFriends, lastCrawled) =>
            `${circleSize} von Ihren ${totalFriends} Freunden ${circleSize === 1 ? "nimmt" : "nehmen"} ebenfalls teil · ${lastCrawled}`,
        takingPart: "Nimmt teil",
        notTakingPart: "Nimmt nicht teil",
        joiningShares:
            "Beim Beitritt wird nur Ihre Freundesliste geteilt, und nur Verbindungen, bei denen die andere Person ebenfalls beigetreten ist.",
        seeMyCircle: "Meinen Kreis ansehen",
        withdrawTitle: "Austreten und alles löschen, was die Studie über diesen Turm gespeichert hat",
        reallyLeave: "Wirklich austreten und löschen?",
        leaveAndDelete: "Austreten und meine Daten löschen",
        joining: "Beitritt läuft...",
        takePart: "Teilnehmen",

        yourCircle: "Ihr Kreis",
        hide: "Ausblenden",
        emptyCircle:
            "Noch niemand aus Ihrer Freundesliste ist beigetreten. Eine Verbindung erscheint erst, wenn beide Personen teilnehmen.",

        noLinkedTowers: "Sie haben noch kein TinyTower-Konto mit Ihrem Tinyburg-Konto verknüpft.",
        linkingExplains: "Über die Verknüpfung wissen wir, dass ein Turm wirklich Ihnen gehört. ",
        linkOne: "Verknüpfen Sie einen auf tinyburg.app",
        thenComeBack: " und kommen Sie dann zurück.",

        heading: "Ihre Türme",
        headingBody:
            "Jeder Turm entscheidet für sich. Bei der Teilnahme wird die Freundesliste dieses Turms geteilt; beim Austritt wird alles gelöscht, was die Studie über ihn gespeichert hat.",
        loading: "Ihre Türme werden geladen...",
        // REVIEW: heading uses "Freundeskreise" for the generic sense; the study's
        // name "Social Circles" stays English elsewhere.
        yourSocialCircles: "Ihre Freundeskreise",
        // REVIEW: same choice as yourSocialCircles.
        namedSocialCircles: (name) => `Freundeskreise von ${name}`,
        signOut: "Abmelden",
        privacyPrefix: "Was wir erheben und warum steht auf der ",
        privacyLink: "Datenschutzseite",
        privacySuffix: ".",
    },
};

/**
 * German messages. Register: formal "Sie".
 *
 * Kept in English (glossary): Tinyburg, TinyTower, Nimblebit, Authproxy,
 * bitizen(s), bux, Discord, and technical terms the API surface owns (scope,
 * Bearer-Token, SDK, gzip). "Towers"/"floors"/"friends" translate normally.
 */

import type { Messages } from "./types.ts";

export const de: Messages = {
    titles: {
        home: "Tinyburg Authproxy | API-Schlüssel für Nimblebits Server",
        login: "Anmelden | Tinyburg Authproxy",
        keys: "Ihre API-Schlüssel | Tinyburg Authproxy",
        admin: "Admin | Tinyburg Authproxy",
        notFound: "Seite nicht gefunden | Tinyburg Authproxy",
    },
    shared: {
        backToHome: "← Zurück zur Startseite",
        cancel: "Abbrechen",
        delete: "Löschen",
        rateLimit: (limit, windowSeconds) => `${limit} Anfragen / ${windowSeconds}s`,
        reallyDelete: "Wirklich löschen?",
        reEnable: "Reaktivieren",
        revoke: "Widerrufen",
        revokedBadge: "Widerrufen",
    },
    home: {
        title: "Tinyburg Authproxy",
        tagline: "Authentifizierter, ratenbegrenzter Zugriff auf Nimblebits TinyTower-Server.",
        manageKeys: "Ihre API-Schlüssel verwalten →",
        signIn: "Mit Tinyburg anmelden →",
        howItWorksHeading: "So funktioniert es",
        howItWorksIntro:
            "Der Proxy signiert Ihre Anfragen, bevor er sie an Nimblebit weiterleitet; Sie kommen also nie mit Salts oder Hashes in Berührung. Authentifizieren Sie sich mit einem API-Schlüssel als Bearer-Token:",
        howItWorksScopes:
            "Ein Schlüssel trägt Scopes, einen je Endpunkt-Familie, und ein eigenes Rate-Limit. Melden Sie sich mit Ihrem Tinyburg-Konto an, um sich selbst Nur-Lese-Schlüssel auszustellen, Ihre Schlüssel einzusehen und geleakte zu rotieren.",
        sdkHeading: "Das SDK verwenden",
        sdkIntroBefore: "Dieser Proxy nutzt dieselben Endpunkt-Definitionen, aus denen ",
        sdkIntroAfter:
            " gebaut ist; ein typisierter TypeScript-Client ist also inklusive. Er dekodiert Spielstände, Freunde, Geschenke, Besuche und Verlosungen in echte Typen und weiß bereits, wie er sich hierher ausrichtet:",
        // REVIEW: "Nimblebit soup" is playful in the original; kept the image.
        sdkOutro:
            "AUTH_KEY ist der Proxy-Schlüssel, den Sie hier ausgestellt haben; PLAYER_ID und PLAYER_AUTH_KEY benennen den Tower, in dessen Namen Sie handeln. Abgerufene Spielstände kommen als gezippte Nimblebit-Suppe zurück: Geben Sie sie an das SaveData-Schema des SDK, und Sie erhalten Stockwerke, Bitizens, Missionen und Freunde als gewöhnliche typisierte Werte.",
        testKeysHeading: "Öffentliche Testschlüssel",
        testKeysIntro: "Zwei geteilte Schlüssel stehen zum Ausprobieren bereit. Sie sind pro IP-Adresse ratenbegrenzt:",
        testKeysOutro:
            "Persönliche Schlüssel sind stattdessen pro Schlüssel ratenbegrenzt und starten mit 10 Anfragen pro Minute. Sie brauchen Schreib-Scopes oder ein höheres Limit? Melden Sie sich auf Discord.",
        footerBefore: "Teil von ",
        footerAfter: ", nicht mit Nimblebit verbunden.",
    },
    login: {
        heading: "Authproxy Self-Service",
        subheading: "Ihr Tinyburg-Konto ist hier Ihre Identität: eine Anmeldung, kein neues Passwort.",
        signInWithTinyburg: "Mit Tinyburg anmelden",
        noAccountBefore: "Noch kein Tinyburg-Konto? ",
        createAccountLink: "Erstellen Sie zuerst eines auf tinyburg.app",
        noAccountAfter: ".",
        cancelled: "Die Anmeldung wurde abgebrochen. Sie können jederzeit dort weitermachen, wo Sie aufgehört haben.",
        interrupted:
            "Dieser Anmeldeversuch ist abgelaufen oder wurde unterbrochen. Bitte beginnen Sie erneut und prüfen Sie, ob Ihr Browser Cookies für diese Seite zulässt.",
        failed: "Ihre Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
    },
    keys: {
        heading: "Ihre API-Schlüssel",
        headingFor: (name) => `API-Schlüssel von ${name}`,
        signOut: "Abmelden",
        sectionHeading: "Ihre API-Schlüssel",
        sectionIntro:
            "Rotieren Sie jeden Schlüssel, der geleakt sein könnte, und löschen Sie die, die Sie nicht mehr verwenden.",
        loading: "Ihre Schlüssel werden geladen...",
        loadFailed: "Ihre Schlüssel konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
        emptyState: "Noch keine Schlüssel. Erstellen Sie einen und rufen Sie den Proxy auf.",
        newKey: "+ Neuer Schlüssel",
        maxKeysTitle: (maxKeys) => `Jedes Konto darf höchstens ${maxKeys} Schlüssel halten`,
        provisionTitle: "Einen neuen Schlüssel ausstellen",
        copy: "Kopieren",
        // REVIEW: "rotieren" as key-rotation jargon; "erneuern" would be plainer.
        rotate: "Rotieren",
        rotateTitle:
            "Stellt einen neuen Schlüssel für diese Zeile aus; der alte Schlüssel funktioniert sofort nicht mehr",
        createdLastUsed: (created, lastUsed) => `Erstellt am ${created} · Zuletzt verwendet am ${lastUsed}`,
        descriptionLabel: "Wofür ist dieser Schlüssel?",
        descriptionPlaceholder: "Optionale Beschreibung, z. B. mein Tower-Statistik-Bot",
        readOnlyScopesLabel: "Nur-Lese-Scopes (mindestens einen wählen)",
        writeScopesNote: "Schreib-Scopes werden von Hand vergeben; melden Sie sich auf Discord",
        createKey: "Schlüssel erstellen",
        notices: {
            copied: "In Ihre Zwischenablage kopiert.",
            created: "Schlüssel erstellt. Er funktioniert sofort.",
            rotated:
                "Schlüssel rotiert. Der alte Schlüssel funktionierte in dem Moment nicht mehr, als der neue ausgestellt wurde.",
            revoked: "Schlüssel widerrufen. Anfragen damit schlagen jetzt fehl.",
            reEnabled: "Schlüssel reaktiviert.",
            deleted: "Schlüssel gelöscht.",
        },
        problems: {
            actionFailed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
            createRefused: (maxKeys) =>
                `Diese Anfrage wurde abgelehnt. Schlüssel brauchen mindestens einen Scope, und jedes Konto darf höchstens ${maxKeys} Schlüssel halten.`,
            clipboardFailed: "Ihre Zwischenablage war nicht erreichbar. Bitte versuchen Sie es erneut.",
        },
    },
    admin: {
        heading: "Admin",
        yourKeysLink: "Ihre Schlüssel",
        // REVIEW: "step up" rendered as raising privileges; no snappy German idiom.
        stepUpHeading: "Berechtigung erhöhen",
        stepUpIntro:
            "Admin-Aktionen brauchen mehr als eine Session: Sie geben das Admin-Passwort ein und autorisieren sich dann erneut bei Tinyburg, damit der Proxy, mit Ihrer Zustimmung, prüfen kann, ob Ihr Konto einen freigeschalteten Tower hält. Die Erhöhung gilt eine Stunde.",
        passwordPlaceholder: "Admin-Passwort",
        // REVIEW: mirrors "Elevate with Tinyburg"; reads unusual in German too.
        elevate: "Mit Tinyburg erhöhen",
        allKeysHeading: "Alle Schlüssel",
        allKeysIntro:
            "Jeder Schlüssel, den der Proxy ausgestellt hat, egal wer ihn hält. Schreib-Scopes werden hier vergeben.",
        loading: "Wird geladen...",
        loadFailed: "Die Schlüssel konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
        emptyState: "Es gibt noch keine Schlüssel.",
        owner: (sub) => `Inhaber ${sub}`,
        noOwner: "Kein Inhaber (von Admins ausgestellt)",
        scopesButton: "Scopes",
        rateLimitButton: "Rate-Limit",
        saveScopes: "Scopes speichern",
        saveLimit: "Limit speichern",
        requestsLabel: "Anfragen",
        // REVIEW: matches the quirky English "per seconds" next to the window field.
        perSecondsLabel: "pro Sekunden",
        notices: {
            saved: "Gespeichert.",
            keyDeleted: "Schlüssel gelöscht.",
        },
        problems: {
            elevationFailed:
                "Die Erhöhung wurde abgelehnt. Prüfen Sie das Passwort, dass Sie die Tower-Prüfung bestätigt haben und dass Ihr Konto einen freigeschalteten Tower hält.",
            actionFailed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
            rateLimitInvalid: "Rate-Limits brauchen positive ganze Zahlen.",
        },
    },
    notFound: {
        heading: "404",
        body: "Dieses Stockwerk wurde noch nicht gebaut.",
    },
};

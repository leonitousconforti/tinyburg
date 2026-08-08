import type { Messages } from "./types.ts";

/**
 * German. Register: formal "Sie" throughout.
 *
 * Glossary kept in English: Tinyburg, TinyTower, Bitizen(s), Bux, brand and
 * provider names (Google, Discord, GitHub, Reddit, NimbleBit). "Floors",
 * "towers" and "friends" translate normally (Etagen, Türme, Freunde).
 */
export const de: Messages = {
    shared: {
        back: "Zurück",
        backToHome: "← Zurück zur Startseite",
        floors: {
            food: "🍕 Essen",
            retail: "🛍️ Handel",
            service: "✂️ Service",
            creative: "🎨 Kreativ",
            recreation: "🎮 Freizeit",
            residential: "🛏️ Wohnen",
            lobby: "🚪 Lobby",
        },
    },
    titles: {
        home: "TinyTower-Tauschbörse | Bitizens, Kostüme & mehr tauschen",
        about: "Über uns | Tinyburg",
        login: "Anmelden | Tinyburg",
        privacy: "Datenschutzerklärung | Tinyburg",
        terms: "Nutzungsbedingungen | Tinyburg",
        sponsors: "Sponsoren | Tinyburg",
        developers: "Entwickler | Tinyburg",
        developerApps: "OAuth-Anwendungen | Tinyburg",
        towerMe: "Meine Türme | Tinyburg",
        towerLink: "Turm verknüpfen | Tinyburg",
        account: "Konto & Sicherheit | Tinyburg",
        notFound: "Seite nicht gefunden | Tinyburg",
    },
    home: {
        nav: {
            browseTrades: "Angebote durchstöbern",
            bitizens: "Bitizens",
            costumes: "Kostüme",
            about: "Über uns",
        },
        logIn: "Anmelden",
        // REVIEW: "Tauschbörse" chosen over a literal "Trading" to read naturally.
        heroTitle: "TinyTower-Tauschbörse",
        heroTagline:
            "Der Community-Marktplatz, um Bitizens, Kostüme, Haustiere und mehr mit TinyTower-Spielern aus aller Welt zu tauschen",
        startTrading: "Jetzt tauschen",
        learnMore: "Mehr erfahren",
        featuresHeading: "Was können Sie tauschen?",
        features: {
            tradeBitizens: {
                title: "Bitizens tauschen",
                description: "Finden Sie Traumjob-Bitizens für Ihren Turm oder tauschen Sie Duplikate ein",
            },
            costumesPets: {
                title: "Kostüme & Haustiere",
                description: "Sammeln Sie seltene Kostüme und niedliche Haustiere für Ihre Bitizens",
            },
            goldenTickets: {
                title: "Goldene Tickets",
                description: "Tauschen Sie Ressourcen und helfen Sie anderen Turmbauern",
            },
            community: {
                title: "Community",
                description: "Vernetzen Sie sich mit Tausenden aktiven TinyTower-Spielern",
            },
        },
        stats: {
            activeTraders: "Aktive Tauschpartner",
            tradesCompleted: "Abgeschlossene Tauschgeschäfte",
            bitizensTraded: "Getauschte Bitizens",
        },
        ctaHeading: "Bereit, Ihren Traumturm zu bauen?",
        ctaBody: "Schließen Sie sich Tausenden Spielern an, die täglich Bitizens und Gegenstände tauschen",
        ctaButton: "Kostenlos loslegen",
        footerAbout: {
            before: "Eine Community-getriebene Tauschplattform für TinyTower-Fans. Nicht mit NimbleBit verbunden. Der Quellcode ist auf ",
            linkLabel: "GitHub",
            after: " verfügbar.",
        },
        quickLinks: "Direktlinks",
        community: "Community",
        legal: "Rechtliches",
        sponsors: "Sponsoren",
        privacyPolicy: "Datenschutzerklärung",
        termsOfService: "Nutzungsbedingungen",
        copyright: "© 2026 Tinyburg. TinyTower ist eine Marke von NimbleBit LLC.",
    },
    about: {
        title: "Über Tinyburg",
        // REVIEW: tone-sensitive tagline.
        tagline: "Verbindungen schaffen, ein Bitizen nach dem anderen",
        whatIsHeading: "Was ist Tinyburg?",
        whatIsBody:
            "Tinyburg ist eine von der Community gebaute Tauschplattform von TinyTower-Fans. Wir machen es einfach, Traumjob-Bitizens zu finden, seltene Kostüme zu tauschen und sich mit Turmbauern aus aller Welt zu vernetzen.",
        missionHeading: "Unsere Mission",
        missions: {
            findDreamJobbers: {
                title: "Traumjob-Bitizens finden",
                description:
                    "Warten Sie nicht länger auf zufällige Bitizens. Durchsuchen Sie unsere Datenbank nach den perfekten 9-Punkte-Traumjob-Bitizens für Ihre Etagen.",
            },
            connectPlayers: {
                title: "Spieler vernetzen",
                description:
                    "Einen Turm zu bauen macht gemeinsam mehr Spaß. Vernetzen Sie sich mit Tausenden aktiven Spielern, die tauschen und einander helfen möchten.",
            },
            collectEverything: {
                title: "Alles sammeln",
                description:
                    "Von seltenen Kostümen bis zu niedlichen Haustieren: Tauschen Sie sich zu einer vollständigen Sammlung.",
            },
        },
        howHeading: "So funktioniert's",
        steps: {
            signUp: {
                title: "Registrieren",
                description: "Erstellen Sie Ihr Konto in Sekunden mit Google oder Discord",
            },
            linkTower: {
                title: "Turm verknüpfen",
                description: "Verknüpfen Sie Ihren Turm über die Cloud-Sync-Funktion von Nimblebit",
            },
            browseTrade: {
                title: "Stöbern & tauschen",
                description: "Finden Sie, was Sie brauchen, und vernetzen Sie sich mit anderen Spielern",
            },
            buildDream: {
                title: "Traumturm bauen",
                description: "Füllen Sie jede Etage mit Traumjob-Bitizens und seltenen Gegenständen",
            },
        },
        communityHeading: "Community zuerst",
        communityBody:
            "Tinyburg wird von leidenschaftlichen TinyTower-Spielern gebaut und gepflegt. Wir sind nicht mit NimbleBit verbunden, teilen aber die Liebe zu kleinen Pixeln und hohen Türmen. Unser Ziel ist es, die TinyTower-Community noch vernetzter und hilfsbereiter zu machen.",
        joinDiscord: "Unserem Discord beitreten",
        openSourceHeading: "Open Source",
        openSourceBody:
            "Tinyburg ist ein Open-Source-Projekt. Wir glauben an Transparenz und Beiträge aus der Community. Schauen Sie sich unseren Code an, melden Sie Fehler oder steuern Sie Funktionen auf GitHub bei.",
        viewOnGithub: "Auf GitHub ansehen",
        ourSponsors: "Unsere Sponsoren",
        faqHeading: "Häufig gestellte Fragen",
        faqs: {
            free: {
                question: "F: Ist Tinyburg kostenlos?",
                answer: "A: Ja! Tinyburg ist völlig kostenlos. Wir sind ein Community-Projekt von Spielern, die das Spiel lieben.",
            },
            affiliated: {
                question: "F: Ist das mit NimbleBit verbunden?",
                answer: "A: Nein, Tinyburg ist ein unabhängiges Fanprojekt. Wir sind in keiner Weise mit NimbleBit LLC verbunden oder von NimbleBit LLC unterstützt.",
            },
            trades: {
                question: "F: Wie funktionieren Tauschgeschäfte?",
                answer: "A: Tinyburg hilft Ihnen, Tauschpartner zu finden und den Austausch zu koordinieren. Der eigentliche Tausch kann je nach Gegenstand über verschiedene Wege ablaufen, etwa über Geschenke oder das Anpassen von Spielständen.",
            },
            dataSafe: {
                question: "Sind meine Daten sicher?",
                before: "Wir erheben nur, was für den Dienst nötig ist. Details finden Sie in unserer ",
                linkLabel: "Datenschutzerklärung",
                after: ".",
            },
        },
    },
    login: {
        heading: "Willkommen bei Tinyburg",
        subheading: "Melden Sie sich an oder erstellen Sie ein Konto, um loszulegen",
        problems: {
            denied: "Die Anmeldung wurde abgebrochen. Sie können jederzeit dort weitermachen, wo Sie aufgehört haben.",
            expired:
                "Dieser Anmeldeversuch ist abgelaufen oder wurde unterbrochen. Bitte beginnen Sie erneut und prüfen Sie, ob Ihr Browser Cookies für diese Seite erlaubt.",
            failed: "Wir konnten Ihre Anmeldung nicht abschließen. Bitte versuchen Sie es erneut.",
        },
        continueWithGoogle: "Weiter mit Google",
        continueWithDiscord: "Weiter mit Discord",
        perks: {
            dreamJobs: "Traumjob-Bitizens finden",
            trade: "Mit Tausenden Spielern tauschen",
            collect: "Seltene Kostüme & Haustiere sammeln",
        },
        agreeBefore: "Indem Sie fortfahren, stimmen Sie unseren ",
        termsOfService: "Nutzungsbedingungen",
        agreeAnd: " und unserer ",
        privacyPolicy: "Datenschutzerklärung",
    },
    account: {
        backToTowers: "← Zurück zu meinen Türmen",
        heading: (name) => `Konto von ${name}`,
        notices: {
            connected: "Verbunden. Sie können sich jetzt damit anmelden.",
            alreadyConnected: "Dieses Konto war bereits verbunden.",
            disconnected: "Getrennt.",
            linkCancelled: "Das Verbinden dieses Kontos wurde abgebrochen.",
        },
        signedOutSessions: (count) =>
            count === 1 ? "Aus 1 Sitzung abgemeldet." : `Aus ${count} Sitzungen abgemeldet.`,
        problems: {
            linkExpired:
                "Dieser Versuch ist abgelaufen oder wurde unterbrochen. Bitte versuchen Sie erneut, das Konto zu verbinden.",
            linkFailed: "Wir konnten dieses Konto nicht verbinden. Bitte versuchen Sie es erneut.",
            accountTaken: "Dieses Konto ist bereits mit einem anderen Tinyburg-Konto verbunden.",
            actionFailed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
            lastSignInMethod: "Das ist Ihre einzige Anmeldemöglichkeit, deshalb muss sie verbunden bleiben.",
        },
        loadFailed: "Das konnte nicht geladen werden. Bitte versuchen Sie es erneut.",
        sessionsHeading: "Ihre aktiven Anmeldungen",
        sessionsBody:
            "Jeder Browser mit einer Sitzung für dieses Konto. Melden Sie sich überall ab, wo Sie etwas nicht wiedererkennen.",
        loadingSessions: "Ihre Sitzungen werden geladen...",
        unknownDevice: "Unbekanntes Gerät",
        deviceOn: (browser, platform) => `${browser} auf ${platform}`,
        thisDevice: "Dieses Gerät",
        lastActive: (when) => `Zuletzt aktiv: ${when}`,
        signedInOn: (date) => `Angemeldet am ${date}`,
        signOut: "Abmelden",
        signOutThisBrowser: "In diesem Browser abmelden",
        signOutOf: (name) => `Von ${name} abmelden`,
        noOtherSessions: "Keine weiteren Sitzungen",
        signOutOthers: (count) => (count === 1 ? "1 weitere Sitzung abmelden" : `${count} weitere Sitzungen abmelden`),
        signOutEverywhere: "Überall abmelden",
        methodsHeading: "Anmeldemethoden",
        methodsBody: "Verbinden Sie weitere Anmeldemöglichkeiten, damit Sie immer wieder in dieses Konto zurückkommen.",
        loading: "Wird geladen...",
        disconnect: "Trennen",
        disconnectProvider: (provider) => `${provider} trennen`,
        lastMethodTitle: "Das ist die einzige Anmeldemöglichkeit, die Ihnen noch bleibt",
        connect: "Verbinden →",
    },
    developers: {
        title: "Tinyburg für Entwickler",
        tagline: "Lassen Sie Spieler ihr Tinyburg-Konto in Ihrer App verwenden",
        signInHeading: "Sign in with Tinyburg",
        signInBody:
            "Tinyburg ist ein OpenID-Connect-Provider. Sie bauen ein Begleit-Tool, ein Discord-Bot-Dashboard oder etwas anderes für die TinyTower-Community? Registrieren Sie eine OAuth-Anwendung, und Spieler melden sich mit demselben Konto an, mit dem sie auch tauschen – ganz ohne neue Passwörter.",
        features: {
            standardOidc: {
                title: "Standard-OIDC",
                description:
                    "Authorization-Code-Flow mit PKCE und ES256-signierten ID-Tokens. Jede OpenID-Connect-Client-Bibliothek funktioniert auf Anhieb.",
            },
            minimalScopes: {
                title: "Minimale Scopes",
                description:
                    "Apps sehen nur Identität, Anzeigenamen und Avatar eines Spielers. Nichts anderes verlässt Tinyburg.",
            },
            playerConsent: {
                title: "Zustimmung der Spieler",
                description:
                    "Spieler genehmigen auf einem Zustimmungsbildschirm genau, was Ihre App sehen darf, bevor Tokens ausgestellt werden.",
            },
        },
        gettingStartedHeading: "Erste Schritte",
        steps: {
            logIn: {
                title: "Bei Tinyburg anmelden",
                description: "Zum Registrieren von Anwendungen brauchen Sie ein Tinyburg-Konto",
            },
            register: {
                title: "Anwendung registrieren",
                description: "Vergeben Sie einen Namen und Ihre Redirect-URIs, dann erhalten Sie Client-ID und Secret",
            },
            point: {
                title: "OIDC-Bibliothek auf uns zeigen lassen",
                description:
                    "Die meisten Bibliotheken brauchen nur die Discovery-URL unten, um sich selbst zu konfigurieren",
            },
            signIn: {
                title: "Spieler melden sich an",
                description: "Sie genehmigen Ihre App einmal und landen wieder auf Ihrer Redirect-URI",
            },
        },
        redirectNote:
            "Redirect-URIs müssen https verwenden, außer localhost während der Entwicklung. Client-Secrets werden einmalig bei der Registrierung angezeigt und gehasht gespeichert – bewahren Sie Ihres also sicher auf.",
        endpointsHeading: "Endpunkte",
        endpointsBody:
            "Alles unten steht auch im Discovery-Dokument, die meisten Setups brauchen daher nur die erste URL.",
        endpointNames: {
            jwks: "JWKS",
            discovery: "Discovery",
            authorization: "Autorisierung",
            token: "Token",
            userinfo: "Userinfo",
        },
        scopesHeading: "Scopes",
        scopeDescriptions: {
            openid: "Ihre Tinyburg-Identität bestätigen",
            profile: "Ihren Anzeigenamen und Avatar sehen",
        },
        readyHeading: "Bereit loszulegen?",
        readyBefore:
            "Registrieren Sie Ihre erste Anwendung und melden Sie Spieler an. Fragen oder irgendwo festgefahren? Fragen Sie im ",
        discordLinkLabel: "Tinyburg-Discord",
        readyAfter: " und wir helfen Ihnen weiter.",
        yourApplications: "Ihre Anwendungen",
        discoveryDocument: "Discovery-Dokument",
    },
    developerApps: {
        heading: "OAuth-Anwendungen",
        comingSoon: "Self-Service-Registrierung kommt bald",
        comingSoonDetail:
            "Sign in with Tinyburg funktioniert bereits. Fragen Sie im Discord, dann registrieren wir Ihre Anwendung bis dahin von Hand.",
        readGuide: "← Integrationsleitfaden lesen",
    },
    sponsors: {
        title: "Danke, Sponsoren!",
        // REVIEW: figurative tagline.
        tagline: "Die Menschen, die auf jeder Etage das Licht anlassen",
        intro: "Tinyburg ist kostenlos, Open Source und wird von Freiwilligen betrieben. Die Server, die Datenbank und die Treuhandkasse für jeden Tausch werden von den großzügigen Menschen auf dieser Seite bezahlt, die das Projekt auf GitHub sponsern. Jeder Einzelne von ihnen macht den Turm ein Stück höher.",
        becomeSponsor: "Sponsor werden",
        currentHeading: "Aktuelle Sponsoren",
        noSponsors: "Noch keine Sponsoren. Seien Sie der erste Bitizen auf dieser Etage!",
        pastHeading: "Ehemalige Sponsoren",
        pastBody: "Einmal Sponsor, immer geschätzt. Danke für die Unterstützung auf dem Weg!",
        otherWaysHeading: "Weitere Möglichkeiten zu helfen",
        otherWaysBody:
            "Sponsern ist nicht der einzige Weg, Tinyburg zu unterstützen. Melden Sie Fehler, steuern Sie eine Funktion bei oder helfen Sie einfach anderen Turmbauern in der Community.",
        starOnGithub: "Auf GitHub einen Stern geben",
        joinDiscord: "Unserem Discord beitreten",
    },
    towerLink: {
        backToTowers: "← Meine Türme",
        heading: "Turm verknüpfen",
        subheading: "Verbinden Sie Ihren TinyTower-Cloud-Spielstand und tauschen Sie mit Spielern aus aller Welt",
        step1: "Schritt 1 von 2",
        step2: "Schritt 2 von 2",
        friendCodeLabel: "Freundescode",
        friendCodeTitle: "Bis zu 5 Buchstaben oder Ziffern",
        friendCodeHint: "Sie finden ihn im Freunde-Tab in TinyTower",
        emailLabel: "Cloud-Sync-E-Mail",
        emailHint:
            "Die E-Mail-Adresse, unter der Ihr Cloud-Spielstand registriert ist. Nimblebit sendet einen Bestätigungscode dorthin.",
        sending: "Wird gesendet...",
        sendCode: "Bestätigungscode senden",
        sentCodeBefore: "📬 Nimblebit hat einen Bestätigungscode an ",
        sentCodeAfter: " gesendet. Es kann eine Minute dauern, bis er ankommt.",
        codeLabel: "Bestätigungscode",
        codeHint: "Keine E-Mail? Prüfen Sie Ihren Spam-Ordner",
        linked: "Verknüpft! Weiterleitung...",
        verifying: "Wird geprüft...",
        linkMyTower: "Meinen Turm verknüpfen",
        goBack: "← Zurück",
        sent: "Gesendet!",
        resend: "E-Mail erneut senden",
        errors: {
            requestFailed:
                "Wir konnten Ihren Turm nicht erreichen. Bitte prüfen Sie Ihren Freundescode und versuchen Sie es erneut.",
            verifyFailed:
                "Dieser Code hat nicht funktioniert. Bitte prüfen Sie ihn und versuchen Sie es erneut, oder lassen Sie die E-Mail erneut senden.",
            resendFailed: "Wir konnten die E-Mail nicht erneut senden. Bitte versuchen Sie es gleich noch einmal.",
        },
    },
    towerMe: {
        avatarAlt: (name) => `Avatar von ${name}`,
        // REVIEW: playful title.
        mayor: "🏙️ Bürgermeister von Tinyburg",
        signOut: "Abmelden",
        towersHeading: "Meine Türme",
        linkATower: "+ Turm verknüpfen",
        noTowers: "Noch keine Türme verknüpft",
        noTowersDetailLong:
            "Verknüpfen Sie Ihren TinyTower-Spielstand, um Ihre Bitizens zu synchronisieren und mit Spielern aus aller Welt zu tauschen.",
        noTowersDetailShort: "Verknüpfen Sie Ihren TinyTower-Spielstand, um mit dem Tauschen zu beginnen.",
        loadingTowers: "Ihre Türme werden geladen...",
        towersLoadFailed: "Wir konnten Ihre Türme nicht laden. Bitte versuchen Sie es erneut.",
        linkedOn: (date) => `Verknüpft am ${date}`,
        accountRow: {
            title: "Konto & Sicherheit",
            detail: "Verwalten Sie, wo Sie angemeldet sind und wie Sie sich anmelden",
        },
        developerRow: {
            title: "Entwicklerportal",
            detail: "Registrieren Sie OAuth-Apps, die Nutzer mit Tinyburg anmelden",
        },
    },
    notFound: {
        heading: "Etage nicht gefunden",
        body: "Vielleicht haben die Bitizens diese Etage verlegt? Versuchen Sie es in der Lobby!",
        goHome: "Zur Startseite",
        goBack: "Zurück",
    },
};

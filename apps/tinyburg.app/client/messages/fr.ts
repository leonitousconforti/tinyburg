import type { Messages } from "./types.ts";

/**
 * French. Register: informal "tu" throughout.
 *
 * Glossary kept in English: Tinyburg, TinyTower, bitizen(s), bux, brand and
 * provider names (Google, Discord, GitHub, Reddit, NimbleBit). "Floors",
 * "towers" and "friends" translate normally (étages, tours, amis).
 */
export const fr: Messages = {
    shared: {
        back: "Retour",
        backToHome: "← Retour à l'accueil",
        floors: {
            food: "🍕 Restauration",
            retail: "🛍️ Boutiques",
            service: "✂️ Services",
            creative: "🎨 Créatif",
            recreation: "🎮 Loisirs",
            residential: "🛏️ Résidentiel",
            lobby: "🚪 Hall",
        },
    },
    titles: {
        home: "Échanges TinyTower | Échange des bitizens, des costumes et plus",
        about: "À propos | Tinyburg",
        login: "Connexion | Tinyburg",
        privacy: "Politique de confidentialité | Tinyburg",
        terms: "Conditions d'utilisation | Tinyburg",
        sponsors: "Sponsors | Tinyburg",
        developers: "Développeurs | Tinyburg",
        developerApps: "Applications OAuth | Tinyburg",
        towerMe: "Mes tours | Tinyburg",
        towerLink: "Relie ta tour | Tinyburg",
        account: "Compte et sécurité | Tinyburg",
        notFound: "Page introuvable | Tinyburg",
    },
    home: {
        nav: {
            browseTrades: "Parcourir les échanges",
            bitizens: "Bitizens",
            costumes: "Costumes",
            about: "À propos",
        },
        logIn: "Connexion",
        heroTitle: "Échanges TinyTower",
        heroTagline:
            "La place de marché communautaire pour échanger bitizens, costumes, animaux et plus avec des joueurs de TinyTower du monde entier",
        startTrading: "Commencer à échanger",
        learnMore: "En savoir plus",
        featuresHeading: "Que peux-tu échanger ?",
        features: {
            tradeBitizens: {
                title: "Échange des bitizens",
                description: "Trouve des bitizens à l'emploi de rêve pour ta tour ou échange tes doublons",
            },
            costumesPets: {
                title: "Costumes et animaux",
                description: "Collectionne des costumes rares et d'adorables animaux pour tes bitizens",
            },
            goldenTickets: {
                title: "Tickets dorés",
                description: "Échange des ressources et aide les autres bâtisseurs de tours",
            },
            community: {
                title: "Communauté",
                description: "Rejoins des milliers de joueurs actifs de TinyTower",
            },
        },
        stats: {
            activeTraders: "Joueurs actifs",
            tradesCompleted: "Échanges réalisés",
            bitizensTraded: "Bitizens échangés",
        },
        ctaHeading: "Prêt à bâtir la tour de tes rêves ?",
        ctaBody: "Rejoins des milliers de joueurs qui échangent bitizens et objets chaque jour",
        ctaButton: "Commencer gratuitement",
        footerAbout: {
            before: "Une plateforme d'échanges communautaire pour les passionnés de TinyTower. Sans affiliation avec NimbleBit. Le code source est disponible sur ",
            linkLabel: "GitHub",
            after: ".",
        },
        quickLinks: "Liens rapides",
        community: "Communauté",
        legal: "Mentions légales",
        sponsors: "Sponsors",
        privacyPolicy: "Politique de confidentialité",
        termsOfService: "Conditions d'utilisation",
        copyright: "© 2026 Tinyburg. TinyTower est une marque de NimbleBit LLC.",
    },
    about: {
        title: "À propos de Tinyburg",
        // REVIEW: tone-sensitive tagline.
        tagline: "Créer des liens, un bitizen à la fois",
        whatIsHeading: "Qu'est-ce que Tinyburg ?",
        whatIsBody:
            "Tinyburg est une plateforme d'échanges créée par la communauté des passionnés de TinyTower. On te facilite la recherche de bitizens à l'emploi de rêve, l'échange de costumes rares et la rencontre de bâtisseurs de tours du monde entier.",
        missionHeading: "Notre mission",
        missions: {
            findDreamJobbers: {
                title: "Trouve les employés de rêve",
                description:
                    "Arrête d'attendre des bitizens au hasard. Cherche dans notre base de données les bitizens parfaits à 9 points pour les emplois de rêve de tes étages.",
            },
            connectPlayers: {
                title: "Relie les joueurs",
                description:
                    "Bâtir une tour est plus amusant à plusieurs. Rejoins des milliers de joueurs actifs prêts à échanger et à s'entraider.",
            },
            collectEverything: {
                title: "Collectionne tout",
                description: "Des costumes rares aux adorables animaux, échange jusqu'à compléter ta collection.",
            },
        },
        howHeading: "Comment ça marche",
        steps: {
            signUp: {
                title: "Inscris-toi",
                description: "Crée ton compte avec Google ou Discord en quelques secondes",
            },
            linkTower: {
                title: "Relie ta tour",
                description: "Utilise la synchronisation cloud de Nimblebit pour relier ta tour",
            },
            browseTrade: {
                title: "Parcours et échange",
                description: "Trouve ce dont tu as besoin et entre en contact avec d'autres joueurs",
            },
            buildDream: {
                title: "Bâtis la tour de tes rêves",
                description: "Remplis chaque étage d'employés de rêve et d'objets rares",
            },
        },
        communityHeading: "La communauté d'abord",
        communityBody:
            "Tinyburg est créé et entretenu par des joueurs passionnés de TinyTower. Nous ne sommes pas affiliés à NimbleBit, mais nous partageons leur amour des petits pixels et des grandes tours. Notre objectif : rendre la communauté TinyTower encore plus soudée et solidaire.",
        joinDiscord: "Rejoins notre Discord",
        openSourceHeading: "Open source",
        openSourceBody:
            "Tinyburg est un projet open source. Nous croyons à la transparence et aux contributions de la communauté. Consulte notre code, signale des bugs ou propose des fonctionnalités sur GitHub.",
        viewOnGithub: "Voir sur GitHub",
        ourSponsors: "Nos sponsors",
        faqHeading: "Questions fréquentes",
        faqs: {
            free: {
                question: "Q : Tinyburg est-il gratuit ?",
                answer: "R : Oui ! Tinyburg est entièrement gratuit. Nous sommes un projet communautaire créé par des joueurs qui aiment le jeu.",
            },
            affiliated: {
                question: "Q : Est-ce affilié à NimbleBit ?",
                answer: "R : Non, Tinyburg est un projet de fans indépendant. Nous ne sommes ni affiliés, ni soutenus, ni liés à NimbleBit LLC de quelque manière que ce soit.",
            },
            trades: {
                question: "Q : Comment fonctionnent les échanges ?",
                answer: "R : Tinyburg t'aide à trouver des partenaires d'échange et à coordonner les transactions. L'échange lui-même peut passer par différentes méthodes selon les objets, comme l'envoi de cadeaux ou la modification des données de sauvegarde.",
            },
            dataSafe: {
                question: "Mes données sont-elles en sécurité ?",
                before: "Nous ne collectons que le nécessaire pour fournir le service. Consulte notre ",
                linkLabel: "politique de confidentialité",
                after: " pour tous les détails.",
            },
        },
    },
    login: {
        heading: "Bienvenue sur Tinyburg",
        subheading: "Connecte-toi ou crée un compte pour commencer",
        problems: {
            denied: "La connexion a été annulée. Tu peux reprendre où tu en étais quand tu veux.",
            expired:
                "Cette tentative de connexion a expiré ou a été interrompue. Recommence et vérifie que ton navigateur autorise les cookies pour ce site.",
            failed: "Nous n'avons pas pu finaliser ta connexion. Réessaie.",
        },
        continueWithGoogle: "Continuer avec Google",
        continueWithDiscord: "Continuer avec Discord",
        perks: {
            dreamJobs: "Trouve des bitizens à l'emploi de rêve",
            trade: "Échange avec des milliers de joueurs",
            collect: "Collectionne costumes rares et animaux",
        },
        agreeBefore: "En continuant, tu acceptes nos ",
        termsOfService: "conditions d'utilisation",
        agreeAnd: " et notre ",
        privacyPolicy: "politique de confidentialité",
    },
    account: {
        backToTowers: "← Retour à mes tours",
        heading: (name) => `Compte de ${name}`,
        notices: {
            connected: "Connecté. Tu peux maintenant t'en servir pour te connecter.",
            alreadyConnected: "Ce compte était déjà connecté.",
            disconnected: "Déconnecté.",
            linkCancelled: "La connexion de ce compte a été annulée.",
        },
        signedOutSessions: (count) => (count === 1 ? "1 session déconnectée." : `${count} sessions déconnectées.`),
        problems: {
            linkExpired: "Cette tentative a expiré ou a été interrompue. Réessaie de connecter le compte.",
            linkFailed: "Nous n'avons pas pu connecter ce compte. Réessaie.",
            accountTaken: "Ce compte est déjà connecté à un autre compte Tinyburg.",
            actionFailed: "Ça n'a pas fonctionné. Réessaie.",
            lastSignInMethod: "C'est ton seul moyen de te connecter, il doit donc rester connecté.",
        },
        loadFailed: "Nous n'avons pas pu charger ceci. Réessaie.",
        sessionsHeading: "Où tu es connecté",
        sessionsBody:
            "Chaque navigateur détenant une session pour ce compte. Déconnecte tous ceux que tu ne reconnais pas.",
        loadingSessions: "Chargement de tes sessions...",
        unknownDevice: "Appareil inconnu",
        deviceOn: (browser, platform) => `${browser} sur ${platform}`,
        thisDevice: "Cet appareil",
        lastActive: (when) => `Dernière activité : ${when}`,
        signedInOn: (date) => `Connecté le ${date}`,
        signOut: "Déconnecter",
        signOutThisBrowser: "Se déconnecter de ce navigateur",
        signOutOf: (name) => `Se déconnecter de ${name}`,
        noOtherSessions: "Aucune autre session",
        signOutOthers: (count) =>
            count === 1 ? "Déconnecter 1 autre session" : `Déconnecter ${count} autres sessions`,
        signOutEverywhere: "Se déconnecter partout",
        methodsHeading: "Méthodes de connexion",
        methodsBody: "Connecte d'autres moyens de te connecter, pour toujours pouvoir retrouver ce compte.",
        loading: "Chargement...",
        disconnect: "Dissocier",
        disconnectProvider: (provider) => `Dissocier ${provider}`,
        lastMethodTitle: "C'est le seul moyen de connexion qu'il te reste",
        connect: "Connecter →",
    },
    developers: {
        title: "Tinyburg pour les développeurs",
        tagline: "Laisse les joueurs utiliser leur compte Tinyburg dans ton appli",
        signInHeading: "Sign in with Tinyburg",
        signInBody:
            "Tinyburg est un fournisseur OpenID Connect. Tu construis un outil compagnon, un tableau de bord pour bot Discord ou autre chose pour la communauté TinyTower ? Enregistre une application OAuth et les joueurs pourront s'y connecter avec le compte qu'ils utilisent déjà pour échanger, sans nouveau mot de passe.",
        features: {
            standardOidc: {
                title: "OIDC standard",
                description:
                    "Flux authorization code avec PKCE et jetons d'identité signés en ES256. Toute bibliothèque cliente OpenID Connect fonctionne directement.",
            },
            minimalScopes: {
                title: "Scopes minimaux",
                description:
                    "Les applis ne voient que l'identité, le nom affiché et l'avatar du joueur. Rien d'autre ne quitte Tinyburg.",
            },
            playerConsent: {
                title: "Consentement du joueur",
                description:
                    "Les joueurs approuvent exactement ce que ton appli peut voir sur un écran de consentement avant l'émission du moindre jeton.",
            },
        },
        gettingStartedHeading: "Premiers pas",
        steps: {
            logIn: {
                title: "Connecte-toi à Tinyburg",
                description: "Il te faut un compte Tinyburg pour enregistrer des applications",
            },
            register: {
                title: "Enregistre ton application",
                description: "Donne-lui un nom et tes URIs de redirection, puis récupère ton client id et ton secret",
            },
            point: {
                title: "Pointe ta bibliothèque OIDC vers nous",
                description:
                    "La plupart des bibliothèques n'ont besoin que de l'URL de discovery ci-dessous pour se configurer",
            },
            signIn: {
                title: "Les joueurs se connectent",
                description: "Ils approuvent ton appli une fois et reviennent sur ton URI de redirection",
            },
        },
        redirectNote:
            "Les URIs de redirection doivent utiliser https, sauf localhost pendant le développement. Les secrets client ne sont affichés qu'une fois à l'enregistrement et stockés hachés, alors garde le tien en lieu sûr.",
        endpointsHeading: "Endpoints",
        endpointsBody:
            "Tout ce qui suit est aussi publié dans le document de discovery, la plupart des configurations n'ont donc besoin que de la première URL.",
        endpointNames: {
            jwks: "JWKS",
            discovery: "Discovery",
            authorization: "Autorisation",
            token: "Jeton",
            userinfo: "Userinfo",
        },
        scopesHeading: "Scopes",
        scopeDescriptions: {
            openid: "Confirmer ton identité Tinyburg",
            profile: "Voir ton nom affiché et ton avatar",
        },
        readyHeading: "Prêt à construire ?",
        readyBefore:
            "Enregistre ta première application et commence à connecter des joueurs. Des questions ou un blocage ? Demande sur le ",
        discordLinkLabel: "Discord Tinyburg",
        readyAfter: " et nous t'aiderons.",
        yourApplications: "Tes applications",
        discoveryDocument: "Document de discovery",
    },
    developerApps: {
        heading: "Applications OAuth",
        comingSoon: "L'enregistrement en libre-service arrive",
        comingSoonDetail:
            "Sign in with Tinyburg fonctionne déjà. Demande sur le Discord et nous enregistrerons ton application à la main en attendant.",
        readGuide: "← Lire le guide d'intégration",
    },
    sponsors: {
        title: "Merci, sponsors !",
        // REVIEW: figurative tagline.
        tagline: "Celles et ceux qui laissent la lumière allumée à chaque étage",
        intro: "Tinyburg est gratuit, open source et géré par des bénévoles. Les serveurs, la base de données et la caisse qui sécurise chaque échange sont payés par les personnes généreuses de cette page qui sponsorisent le projet sur GitHub. Chacune d'elles rend la tour un peu plus haute.",
        becomeSponsor: "Devenir sponsor",
        currentHeading: "Sponsors actuels",
        noSponsors: "Pas encore de sponsors. Sois le premier bitizen de cet étage !",
        pastHeading: "Anciens sponsors",
        pastBody: "Sponsor un jour, apprécié toujours. Merci d'avoir aidé en chemin !",
        otherWaysHeading: "D'autres façons d'aider",
        otherWaysBody:
            "Sponsoriser n'est pas la seule façon de soutenir Tinyburg. Signale des bugs, contribue une fonctionnalité ou viens simplement aider les autres bâtisseurs de tours de la communauté.",
        starOnGithub: "Mettre une étoile sur GitHub",
        joinDiscord: "Rejoins notre Discord",
    },
    towerLink: {
        backToTowers: "← Mes tours",
        heading: "Relie ta tour",
        subheading: "Connecte ta sauvegarde cloud TinyTower pour commencer à échanger avec des joueurs du monde entier",
        step1: "Étape 1 sur 2",
        step2: "Étape 2 sur 2",
        friendCodeLabel: "Code ami",
        friendCodeTitle: "Jusqu'à 5 lettres ou chiffres",
        friendCodeHint: "Tu le trouveras dans l'onglet Amis de TinyTower",
        emailLabel: "E-mail de synchronisation cloud",
        emailHint:
            "L'adresse e-mail avec laquelle ta sauvegarde cloud est enregistrée. Nimblebit y enverra un code de vérification.",
        sending: "Envoi...",
        sendCode: "Envoyer le code de vérification",
        sentCodeBefore: "📬 Nimblebit a envoyé un code de vérification à ",
        sentCodeAfter: ". Il peut mettre une minute à arriver.",
        codeLabel: "Code de vérification",
        codeHint: "Pas d'e-mail ? Vérifie ton dossier spam",
        linked: "Reliée ! Redirection...",
        verifying: "Vérification...",
        linkMyTower: "Relier ma tour",
        goBack: "← Retour",
        sent: "Envoyé !",
        resend: "Renvoyer l'e-mail",
        errors: {
            requestFailed: "Nous n'avons pas pu joindre ta tour. Vérifie ton code ami et réessaie.",
            verifyFailed: "Ce code n'a pas fonctionné. Vérifie-le et réessaie, ou renvoie l'e-mail.",
            resendFailed: "Nous n'avons pas pu renvoyer l'e-mail. Réessaie dans un instant.",
        },
    },
    towerMe: {
        avatarAlt: (name) => `Avatar de ${name}`,
        // REVIEW: playful title.
        mayor: "🏙️ Maire de Tinyburg",
        signOut: "Déconnexion",
        towersHeading: "Mes tours",
        linkATower: "+ Relier une tour",
        noTowers: "Aucune tour reliée pour l'instant",
        noTowersDetailLong:
            "Relie ta sauvegarde TinyTower pour synchroniser tes bitizens et commencer à échanger avec des joueurs du monde entier.",
        noTowersDetailShort: "Relie ta sauvegarde TinyTower pour commencer à échanger.",
        loadingTowers: "Chargement de tes tours...",
        towersLoadFailed: "Nous n'avons pas pu charger tes tours. Réessaie.",
        linkedOn: (date) => `Reliée le ${date}`,
        accountRow: {
            title: "Compte et sécurité",
            detail: "Gère où tu es connecté et comment tu te connectes",
        },
        developerRow: {
            title: "Portail développeur",
            detail: "Enregistre des applis OAuth qui connectent les utilisateurs avec Tinyburg",
        },
    },
    notFound: {
        heading: "Étage introuvable",
        body: "Les bitizens ont peut-être déplacé cet étage ? Essaie plutôt le hall !",
        goHome: "Retour à l'accueil",
        goBack: "Page précédente",
    },
};

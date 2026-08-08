/**
 * French, informal register ("tu") throughout. Kept in English: Tinyburg,
 * TinyTower, tinyburg.app, Social Circles (the study's name), and the in-game
 * setting name "Only Friend Visits". Ordinary words like towers, floors and
 * friends translate normally.
 */

import type { Messages } from "./types.ts";

export const fr: Messages = {
    titles: {
        // REVIEW: subtitle phrasing for "An Opt-In Friend Network Study".
        home: "TinyTower Social Circles | Une étude volontaire du réseau d'amis",
        login: "Connexion | Social Circles",
        towers: "Tes tours | Social Circles",
        privacy: "Ce que tu partagerais | Social Circles",
        notFound: "Page introuvable | Social Circles",
    },

    home: {
        title: "TinyTower Social Circles",
        tagline: "Une étude volontaire sur les liens entre joueurs de TinyTower.",
        permissionTitle: "Rien sans permission",
        permissionBody:
            "Ta liste d'amis n'est jamais lue avant que tu te connectes et que tu dises oui, pour cette tour précise. Tu peux arrêter et tout effacer à tout moment.",
        connectionTitle: "Une connexion demande deux personnes",
        connectionBody:
            "Nous n'enregistrons une amitié que lorsque les deux joueurs ont rejoint l'étude. Si ton ami ne l'a pas fait, cette connexion n'est jamais stockée, pas même comme indice.",
        botTitle: "Pas besoin d'ajouter un bot en ami",
        // REVIEW: "Only Friend Visits" kept in English; the game may localize it.
        botBody:
            "Les anciennes versions de cette étude demandaient d'ajouter un compte bot en ami. C'est terminé. La permission passe par ton compte Tinyburg, tu peux donc laisser « Only Friend Visits » activé.",
        yourTowers: "Tes tours →",
        signIn: "Se connecter avec Tinyburg",
        whatYoudShare: "Ce que tu partagerais",
    },

    login: {
        backToHome: "← Retour à l'accueil",
        heading: "Social Circles",
        intro: "La connexion nous permet de savoir qu'une tour est vraiment la tienne. Rien n'est collecté avant que tu le dises, tour par tour.",
        cancelled: "La connexion a été annulée. Rien n'a été partagé, et tu peux reprendre quand tu veux.",
        interrupted:
            "Cette tentative de connexion a expiré ou a été interrompue. Recommence, et vérifie que ton navigateur accepte les cookies pour ce site.",
        failed: "Nous n'avons pas pu finaliser ta connexion. Réessaie.",
        signInWithTinyburg: "Se connecter avec Tinyburg",
        noAccountPrefix: "Pas encore de compte Tinyburg ? ",
        // REVIEW: imperative with "en" ("crées-en") reads informal on purpose.
        createAccount: "Crées-en un d'abord sur tinyburg.app",
        noAccountSuffix: ".",
    },

    notFound: {
        heading: "Page introuvable",
        body: "Il n'y a pas d'étage à cette adresse.",
        backToLobby: "Retour au hall d'entrée",
    },

    towers: {
        loadFailed:
            "Nous n'avons pas pu joindre tinyburg.app pour vérifier quelles tours t'appartiennent. Essaie de te reconnecter ; si cela continue, le fournisseur est peut-être hors service.",
        actionFailed: "Ça n'a pas fonctionné. Réessaie.",
        enrollForbidden:
            "tinyburg.app n'a pas pu confirmer que cette tour t'appartient. Vérifie qu'elle est toujours liée à ton compte Tinyburg.",
        withdrawNotFound: "Cette tour ne participe pas, il n'y avait donc rien à retirer.",
        enrolledCrawled: "Tu participes. Ton cercle est ci-dessous.",
        enrolledPending:
            "Tu participes. Nous n'avons pas pu lire ta tour à l'instant, ton cercle apparaîtra donc après le prochain passage planifié.",
        withdrawn: (eventsRemoved) =>
            `Supprimé. ${eventsRemoved} enregistrement${eventsRemoved === 1 ? "" : "s"} te concernant ${eventsRemoved === 1 ? "a été supprimé" : "ont été supprimés"}, et tu ne fais plus partie de l'étude.`,

        notReadYet: "pas encore lue",
        lastRead: (date) => `dernière lecture le ${date}`,
        inTheStudy: (lastCrawled) => `Dans l'étude · ${lastCrawled}`,
        circleSummary: (circleSize, totalFriends, lastCrawled) =>
            `${circleSize} de tes ${totalFriends} amis ${circleSize === 1 ? "participe" : "participent"} aussi · ${lastCrawled}`,
        takingPart: "Participe",
        notTakingPart: "Ne participe pas",
        joiningShares:
            "Rejoindre ne partage que ta liste d'amis, et seulement les connexions où l'autre personne a aussi rejoint l'étude.",
        seeMyCircle: "Voir mon cercle",
        withdrawTitle: "Se retirer et supprimer tout ce que l'étude détient sur cette tour",
        reallyLeave: "Vraiment quitter et supprimer ?",
        leaveAndDelete: "Quitter et supprimer mes données",
        joining: "Inscription...",
        takePart: "Participer",

        yourCircle: "Ton cercle",
        hide: "Masquer",
        emptyCircle:
            "Personne de ta liste d'amis n'a encore rejoint l'étude. Une connexion n'apparaît que lorsque les deux personnes participent.",

        noLinkedTowers: "Tu n'as pas encore lié de compte TinyTower à ton compte Tinyburg.",
        linkingExplains: "Le lien nous permet de savoir qu'une tour est vraiment la tienne. ",
        // REVIEW: imperative with "en" ("lies-en") reads informal on purpose.
        linkOne: "Lies-en une sur tinyburg.app",
        thenComeBack: ", puis reviens.",

        heading: "Tes tours",
        headingBody:
            "Chaque tour décide pour elle-même. Participer partage la liste d'amis de cette tour ; quitter efface tout ce que l'étude détient sur elle.",
        loading: "Chargement de tes tours...",
        yourSocialCircles: "Tes cercles sociaux",
        namedSocialCircles: (name) => `Les cercles sociaux de ${name}`,
        signOut: "Se déconnecter",
        privacyPrefix: "Ce que nous collectons et pourquoi est détaillé sur la ",
        privacyLink: "page de confidentialité",
        privacySuffix: ".",
    },
};

/**
 * French messages. Register: informal "tu".
 *
 * Kept in English (glossary): Tinyburg, TinyTower, Nimblebit, Authproxy,
 * bitizen(s), bux, Discord, and technical terms the API surface owns (scope,
 * jeton bearer, SDK, gzip). "Towers"/"floors"/"friends" translate normally.
 */

import type { Messages } from "./types.ts";

export const fr: Messages = {
    titles: {
        home: "Tinyburg Authproxy | Clés d'API pour les serveurs de Nimblebit",
        login: "Connexion | Tinyburg Authproxy",
        keys: "Tes clés d'API | Tinyburg Authproxy",
        admin: "Admin | Tinyburg Authproxy",
        notFound: "Page introuvable | Tinyburg Authproxy",
    },
    shared: {
        backToHome: "← Retour à l'accueil",
        cancel: "Annuler",
        delete: "Supprimer",
        rateLimit: (limit, windowSeconds) => `${limit} requêtes / ${windowSeconds}s`,
        reallyDelete: "Vraiment supprimer ?",
        reEnable: "Réactiver",
        revoke: "Révoquer",
        revokedBadge: "Révoquée",
    },
    home: {
        title: "Tinyburg Authproxy",
        tagline: "Un accès authentifié et limité en débit aux serveurs TinyTower de Nimblebit.",
        manageKeys: "Gérer tes clés d'API →",
        signIn: "Se connecter avec Tinyburg →",
        howItWorksHeading: "Comment ça marche",
        howItWorksIntro:
            "Le proxy signe tes requêtes avant de les transmettre à Nimblebit : tu ne touches jamais aux salts ni aux hashes. Authentifie-toi avec une clé d'API comme jeton bearer :",
        howItWorksScopes:
            "Une clé porte des scopes, un par famille d'endpoints, et sa propre limite de débit. Connecte-toi avec ton compte Tinyburg pour créer toi-même des clés en lecture seule, voir les clés que tu détiens et régénérer celles qui fuient.",
        sdkHeading: "Utiliser le SDK",
        sdkIntroBefore: "Ce proxy sert les mêmes définitions d'endpoints que celles à partir desquelles ",
        sdkIntroAfter:
            " est construit, donc un client TypeScript typé est offert. Il décode les sauvegardes, les amis, les cadeaux, les visites et les tombolas en vrais types, et il sait déjà se diriger ici :",
        // REVIEW: "Nimblebit soup" is playful in the original; kept the image.
        sdkOutro:
            "AUTH_KEY est la clé du proxy que tu as créée ici ; PLAYER_ID et PLAYER_AUTH_KEY désignent la tour au nom de laquelle tu agis. Les sauvegardes récupérées arrivent en soupe Nimblebit compressée en gzip : passe-les au schéma SaveData du SDK et tu obtiens les étages, les bitizens, les missions et les amis comme valeurs typées ordinaires.",
        testKeysHeading: "Clés de test publiques",
        testKeysIntro: "Deux clés partagées existent pour essayer. Elles sont limitées en débit par adresse IP :",
        testKeysOutro:
            "Les clés personnelles sont limitées en débit par clé et démarrent à 10 requêtes par minute. Besoin de scopes en écriture ou d'une limite plus haute ? Passe nous voir sur Discord.",
        footerBefore: "Fait partie de ",
        footerAfter: ", sans affiliation avec Nimblebit.",
    },
    login: {
        // REVIEW: "Self Service" rendered as "libre-service"; may read like a shop.
        heading: "Authproxy en libre-service",
        subheading: "Ton compte Tinyburg est ton identité ici : une seule connexion, pas de nouveau mot de passe.",
        signInWithTinyburg: "Se connecter avec Tinyburg",
        noAccountBefore: "Pas encore de compte Tinyburg ? ",
        createAccountLink: "Crées-en d'abord un sur tinyburg.app",
        noAccountAfter: ".",
        cancelled: "La connexion a été annulée. Tu peux reprendre où tu en étais quand tu veux.",
        interrupted:
            "Cette tentative de connexion a expiré ou a été interrompue. Recommence et vérifie que ton navigateur accepte les cookies pour ce site.",
        failed: "Nous n'avons pas pu terminer ta connexion. Réessaie.",
    },
    keys: {
        heading: "Tes clés d'API",
        headingFor: (name) => `Clés d'API de ${name}`,
        signOut: "Se déconnecter",
        sectionHeading: "Tes clés d'API",
        sectionIntro: "Régénère toute clé qui aurait pu fuiter et supprime celles que tu n'utilises plus.",
        loading: "Chargement de tes clés...",
        loadFailed: "Nous n'avons pas pu charger tes clés. Réessaie.",
        emptyState: "Pas encore de clé. Crées-en une et commence à appeler le proxy.",
        newKey: "+ Nouvelle clé",
        maxKeysTitle: (maxKeys) => `Chaque compte peut détenir au plus ${maxKeys} clés`,
        provisionTitle: "Créer une nouvelle clé",
        copy: "Copier",
        // REVIEW: "rotate" rendered as "régénérer"; "faire une rotation" felt heavy.
        rotate: "Régénérer",
        rotateTitle: "Émet une nouvelle clé pour cette ligne ; l'ancienne cesse de fonctionner immédiatement",
        createdLastUsed: (created, lastUsed) => `Créée le ${created} · Dernière utilisation le ${lastUsed}`,
        descriptionLabel: "À quoi sert cette clé ?",
        descriptionPlaceholder: "Description facultative, p. ex. mon bot de stats de tours",
        readOnlyScopesLabel: "Scopes en lecture seule (choisis-en au moins un)",
        writeScopesNote: "Les scopes en écriture sont accordés à la main : passe nous voir sur Discord",
        createKey: "Créer la clé",
        notices: {
            copied: "Copiée dans ton presse-papiers.",
            created: "Clé créée. Elle fonctionne immédiatement.",
            rotated: "Clé régénérée. L'ancienne clé a cessé de fonctionner dès que la nouvelle a été émise.",
            revoked: "Clé révoquée. Les requêtes qui l'utilisent échouent désormais.",
            reEnabled: "Clé réactivée.",
            deleted: "Clé supprimée.",
        },
        problems: {
            actionFailed: "Ça n'a pas fonctionné. Réessaie.",
            createRefused: (maxKeys) =>
                `Cette requête a été refusée. Une clé a besoin d'au moins un scope, et chaque compte peut détenir au plus ${maxKeys} clés.`,
            clipboardFailed: "Nous n'avons pas pu accéder à ton presse-papiers. Réessaie.",
        },
    },
    admin: {
        heading: "Admin",
        yourKeysLink: "Tes clés",
        // REVIEW: "step up" rendered as raising privileges; no snappy French idiom.
        stepUpHeading: "Élever les droits",
        stepUpIntro:
            "Les actions d'admin demandent plus qu'une session : tu saisis le mot de passe admin, puis tu réautorises avec Tinyburg pour que le proxy puisse vérifier, avec ton accord, que ton compte détient une tour sur liste autorisée. L'élévation dure une heure.",
        passwordPlaceholder: "Mot de passe admin",
        // REVIEW: mirrors "Elevate with Tinyburg"; reads unusual in French too.
        elevate: "Élever avec Tinyburg",
        allKeysHeading: "Toutes les clés",
        allKeysIntro:
            "Chaque clé émise par le proxy, qui que soit son détenteur. Les scopes en écriture s'accordent ici.",
        loading: "Chargement...",
        loadFailed: "Nous n'avons pas pu charger les clés. Réessaie.",
        emptyState: "Aucune clé n'existe pour l'instant.",
        owner: (sub) => `Propriétaire ${sub}`,
        noOwner: "Sans propriétaire (émise par un admin)",
        scopesButton: "Scopes",
        rateLimitButton: "Limite de débit",
        saveScopes: "Enregistrer les scopes",
        saveLimit: "Enregistrer la limite",
        requestsLabel: "Requêtes",
        // REVIEW: matches the quirky English "per seconds" next to the window field.
        perSecondsLabel: "par secondes",
        notices: {
            saved: "Enregistré.",
            keyDeleted: "Clé supprimée.",
        },
        problems: {
            elevationFailed:
                "L'élévation a été refusée. Vérifie le mot de passe, que tu as bien approuvé la vérification de la tour et que ton compte détient une tour sur liste autorisée.",
            actionFailed: "Ça n'a pas fonctionné. Réessaie.",
            rateLimitInvalid: "Les limites de débit demandent des nombres entiers positifs.",
        },
    },
    notFound: {
        heading: "404",
        body: "Cet étage n'a pas encore été construit.",
    },
};

/**
 * Localized copy for the server-rendered OIDC consent screen.
 *
 * Every locale is typed `: ConsentMessages`, so a missing key anywhere is a
 * compile error. Brand names (Tinyburg, TinyTower) and scope identifiers stay
 * in English in every locale. Interpolated values (`clientName`, `host`) are
 * escaped by the caller before they reach these functions.
 */

import type { Language } from "@tinyburg/ui/Internationalization";

export interface ConsentMessages {
    /** The document title; receives the already-escaped client name. */
    readonly title: (clientName: string) => string;
    /** The lead line under the client's name heading. */
    readonly wantsAccess: string;
    /**
     * What each scope means, in the second person, for the consent screen.
     *
     * These are the words a player decides on, so they say what the
     * application gains rather than naming the endpoints it unlocks.
     * `offline_access` in particular has to be honest that the application
     * keeps working once the browser is closed, because that is the part
     * nobody expects.
     */
    readonly scopeDescriptions: Record<string, string>;
    /** The approve button label. */
    readonly authorize: string;
    /** The deny button label. */
    readonly cancel: string;
    /** The footer line naming the redirect destination; receives the already-escaped host. */
    readonly destination: (host: string) => string;
}

const en: ConsentMessages = {
    title: (clientName) => `Authorize ${clientName} | Tinyburg`,
    wantsAccess: "wants to access your Tinyburg account",
    scopeDescriptions: {
        openid: "Confirm your Tinyburg identity",
        profile: "See your display name and avatar",
        towers: "See and manage the TinyTower saves you have linked",
        "towers:read": "See the TinyTower saves you have linked, without changing them",
        "towers:write": "Change the TinyTower saves you have linked, including uploading saves and entering raffles",
        offline_access: "Keep doing this in the background, even when you are not using it",
    },
    authorize: "Authorize",
    cancel: "Cancel",
    destination: (host) => `After authorizing you'll be sent back to ${host}`,
};

// German: formal register ("Sie"). Tinyburg, TinyTower, and scope identifiers stay in English.
const de: ConsentMessages = {
    title: (clientName) => `${clientName} autorisieren | Tinyburg`,
    wantsAccess: "möchte auf Ihr Tinyburg-Konto zugreifen",
    scopeDescriptions: {
        openid: "Ihre Tinyburg-Identität bestätigen",
        profile: "Ihren Anzeigenamen und Avatar sehen",
        towers: "Die von Ihnen verknüpften TinyTower-Spielstände sehen und verwalten",
        "towers:read": "Die von Ihnen verknüpften TinyTower-Spielstände sehen, ohne sie zu verändern",
        // REVIEW: consent-critical wording for save uploads and raffle entry
        "towers:write":
            "Die von Ihnen verknüpften TinyTower-Spielstände verändern, einschließlich des Hochladens von Spielständen und der Teilnahme an Verlosungen",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Dies auch im Hintergrund weiter tun, selbst wenn Sie die Anwendung gerade nicht verwenden",
    },
    authorize: "Autorisieren",
    cancel: "Abbrechen",
    destination: (host) => `Nach der Autorisierung werden Sie zurück zu ${host} geleitet`,
};

// Spanish: informal register ("tú"). Tinyburg, TinyTower, and scope identifiers stay in English.
const es: ConsentMessages = {
    title: (clientName) => `Autorizar ${clientName} | Tinyburg`,
    wantsAccess: "quiere acceder a tu cuenta de Tinyburg",
    scopeDescriptions: {
        openid: "Confirmar tu identidad de Tinyburg",
        profile: "Ver tu nombre visible y tu avatar",
        towers: "Ver y gestionar las partidas de TinyTower que has vinculado",
        "towers:read": "Ver las partidas de TinyTower que has vinculado, sin modificarlas",
        // REVIEW: consent-critical wording for save uploads and raffle entry
        "towers:write":
            "Modificar las partidas de TinyTower que has vinculado, incluyendo subir partidas y participar en sorteos",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Seguir haciendo esto en segundo plano, incluso cuando no la estés usando",
    },
    authorize: "Autorizar",
    cancel: "Cancelar",
    destination: (host) => `Después de autorizar volverás a ${host}`,
};

// French: informal register ("tu"). Tinyburg, TinyTower, and scope identifiers stay in English.
const fr: ConsentMessages = {
    title: (clientName) => `Autoriser ${clientName} | Tinyburg`,
    wantsAccess: "veut accéder à ton compte Tinyburg",
    scopeDescriptions: {
        openid: "Confirmer ton identité Tinyburg",
        profile: "Voir ton nom d'affichage et ton avatar",
        towers: "Voir et gérer les sauvegardes TinyTower que tu as liées",
        "towers:read": "Voir les sauvegardes TinyTower que tu as liées, sans les modifier",
        // REVIEW: consent-critical wording for save uploads and raffle entry
        "towers:write":
            "Modifier les sauvegardes TinyTower que tu as liées, y compris téléverser des sauvegardes et participer aux tirages au sort",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Continuer à le faire en arrière-plan, même quand tu ne l'utilises pas",
    },
    authorize: "Autoriser",
    cancel: "Annuler",
    // REVIEW: "renvoyé" is masculine-default; no gender-neutral form fits this line naturally
    destination: (host) => `Après l'autorisation, tu seras renvoyé vers ${host}`,
};

export const consentMessagesFor: Record<Language, ConsentMessages> = { de, en, es, fr };

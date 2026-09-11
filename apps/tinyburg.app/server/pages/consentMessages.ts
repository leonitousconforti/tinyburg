/**
 * Localized copy for the server-rendered OIDC consent screen.
 *
 * Every locale is typed `: ConsentMessages`, so a missing key anywhere is a
 * compile error. Brand names (Tinyburg, TinyTower) and scope identifiers stay
 * in English in every locale. Interpolated values (`clientName`, `host`) arrive
 * raw: the page is a Foldkit view, so escaping happens in the serializer at the
 * point the text becomes markup, not at each call site here.
 */

import type { Language } from "@tinyburg/shared-ui/Internationalization";

export interface ConsentMessages {
    /** The document title; receives the client name verbatim. */
    readonly title: (clientName: string) => string;
    /** The lead line under the client's name heading. */
    readonly wantsAccess: string;
    /**
     * What each OIDC scope means, in the second person, for the consent
     * screen. Only `openid`, `profile` and `offline_access` are here: the game
     * scopes describe themselves, in English, from the api that enforces them
     * (`consent.ts`), so their words cannot drift from what they unlock.
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
    /** The footer line naming the redirect destination; receives the host verbatim. */
    readonly destination: (host: string) => string;
    /**
     * The refusals the authorize and consent routes can answer with.
     *
     * These are the only OIDC failures the visitor is shown a page for. Every
     * other failure goes to the client's redirect uri as an error parameter,
     * per RFC 6749; these cannot, because the request that named the redirect
     * uri is the thing that is wrong.
     */
    readonly errors: {
        readonly title: string;
        readonly malformedRequest: string;
        readonly unknownClient: string;
        readonly unregisteredRedirectUri: string;
        readonly expiredRequest: string;
        readonly malformedDecision: string;
    };
}

const en: ConsentMessages = {
    title: (clientName) => `Authorize ${clientName} | Tinyburg`,
    wantsAccess: "wants to access your Tinyburg account",
    scopeDescriptions: {
        openid: "Confirm your Tinyburg identity",
        profile: "See your display name and avatar",
        offline_access: "Keep doing this in the background, even when you are not using it",
    },
    authorize: "Authorize",
    cancel: "Cancel",
    destination: (host) => `After authorizing you'll be sent back to ${host}`,
    errors: {
        title: "Something went wrong",
        malformedRequest: "This authorization request is malformed. PKCE with S256 is required.",
        unknownClient: "Unknown client.",
        unregisteredRedirectUri: "The redirect uri is not registered for this client.",
        expiredRequest: "This authorization request has expired. Please start over.",
        malformedDecision: "This consent decision is malformed.",
    },
};

// German: formal register ("Sie"). Tinyburg, TinyTower, and scope identifiers stay in English.
const de: ConsentMessages = {
    title: (clientName) => `${clientName} autorisieren | Tinyburg`,
    wantsAccess: "möchte auf Ihr Tinyburg-Konto zugreifen",
    scopeDescriptions: {
        openid: "Ihre Tinyburg-Identität bestätigen",
        profile: "Ihren Anzeigenamen und Avatar sehen",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Dies auch im Hintergrund weiter tun, selbst wenn Sie die Anwendung gerade nicht verwenden",
    },
    authorize: "Autorisieren",
    cancel: "Abbrechen",
    destination: (host) => `Nach der Autorisierung werden Sie zurück zu ${host} geleitet`,
    errors: {
        title: "Etwas ist schiefgelaufen",
        malformedRequest: "Diese Autorisierungsanfrage ist fehlerhaft. PKCE mit S256 ist erforderlich.",
        unknownClient: "Unbekannter Client.",
        unregisteredRedirectUri: "Die Redirect-URI ist für diesen Client nicht registriert.",
        expiredRequest: "Diese Autorisierungsanfrage ist abgelaufen. Bitte beginnen Sie von vorne.",
        malformedDecision: "Diese Zustimmungsentscheidung ist fehlerhaft.",
    },
};

// Spanish: informal register ("tú"). Tinyburg, TinyTower, and scope identifiers stay in English.
const es: ConsentMessages = {
    title: (clientName) => `Autorizar ${clientName} | Tinyburg`,
    wantsAccess: "quiere acceder a tu cuenta de Tinyburg",
    scopeDescriptions: {
        openid: "Confirmar tu identidad de Tinyburg",
        profile: "Ver tu nombre visible y tu avatar",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Seguir haciendo esto en segundo plano, incluso cuando no la estés usando",
    },
    authorize: "Autorizar",
    cancel: "Cancelar",
    destination: (host) => `Después de autorizar volverás a ${host}`,
    errors: {
        title: "Algo ha salido mal",
        malformedRequest: "Esta solicitud de autorización es incorrecta. Se requiere PKCE con S256.",
        unknownClient: "Cliente desconocido.",
        unregisteredRedirectUri: "La redirect uri no está registrada para este cliente.",
        expiredRequest: "Esta solicitud de autorización ha caducado. Vuelve a empezar.",
        malformedDecision: "Esta decisión de consentimiento es incorrecta.",
    },
};

// French: informal register ("tu"). Tinyburg, TinyTower, and scope identifiers stay in English.
const fr: ConsentMessages = {
    title: (clientName) => `Autoriser ${clientName} | Tinyburg`,
    wantsAccess: "veut accéder à ton compte Tinyburg",
    scopeDescriptions: {
        openid: "Confirmer ton identité Tinyburg",
        profile: "Voir ton nom d'affichage et ton avatar",
        // REVIEW: consent-critical wording for background access while signed out
        offline_access: "Continuer à le faire en arrière-plan, même quand tu ne l'utilises pas",
    },
    authorize: "Autoriser",
    cancel: "Annuler",
    // REVIEW: "renvoyé" is masculine-default; no gender-neutral form fits this line naturally
    destination: (host) => `Après l'autorisation, tu seras renvoyé vers ${host}`,
    errors: {
        title: "Une erreur s'est produite",
        malformedRequest: "Cette demande d'autorisation est incorrecte. PKCE avec S256 est requis.",
        unknownClient: "Client inconnu.",
        unregisteredRedirectUri: "L'URI de redirection n'est pas enregistrée pour ce client.",
        expiredRequest: "Cette demande d'autorisation a expiré. Recommence.",
        malformedDecision: "Cette décision de consentement est incorrecte.",
    },
};

export const consentMessagesFor: Record<Language, ConsentMessages> = { de, en, es, fr };

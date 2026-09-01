import type { Language } from "@tinyburg/shared-ui/Internationalization";

/**
 * Every user-facing string the bot produces, per language.
 *
 * The `: BotMessages` annotation on each locale is the completeness check: a
 * key missing from any locale is a compile error. Interpolated strings are
 * functions so each language controls its own word order.
 *
 * The `/whois` reply is modelled as four full sentences rather than a
 * composed subject + predicate: gluing "You have" / "<@id> has" onto a shared
 * tail does not survive translation (word order, case, agreement all shift).
 *
 * Glossary kept in English everywhere: Tinyburg, TinyTower, bitizen(s), bux,
 * Discord, and the slash-command names (`/link`, `/unlink`, `/whois`).
 */
export interface BotMessages {
    // Interaction replies
    readonly unknownInvoker: string;
    readonly alreadyLinked: (name: string) => string;
    readonly fallbackAccountName: string;
    readonly linkPrompt: string;
    readonly linkButtonLabel: string;
    readonly whoisSelfNotLinked: string;
    readonly whoisOtherNotLinked: (mention: string) => string;
    readonly whoisSelfLinked: (name: string) => string;
    readonly whoisOtherLinked: (mention: string, name: string) => string;
    readonly notLinked: string;
    readonly unlinked: string;
    readonly linkedFollowUp: (name: string) => string;
    readonly fallbackYourAccountName: string;
    // OAuth result pages (bodies are HTML fragments; `name` is interpolated
    // with exactly the escaping the caller applied, none today)
    readonly linkedTitle: string;
    readonly linkedBody: (name: string) => string;
    readonly failedTitle: string;
    readonly failedBody: string;
    readonly cancelledTitle: string;
    readonly cancelledBody: string;
}

const en: BotMessages = {
    unknownInvoker: "I could not tell who ran that command.",
    alreadyLinked: (name) => `This Discord account is already linked to **${name}**. Run \`/unlink\` first.`,
    fallbackAccountName: "a Tinyburg account",
    linkPrompt: [
        "Sign in at tinyburg.app to link your account. This link works once and expires in 10 minutes.",
        "",
        "It only asks to confirm who you are: your towers stay private until you grant that separately.",
    ].join("\n"),
    linkButtonLabel: "Link my Tinyburg account",
    whoisSelfNotLinked: "You have not linked a Tinyburg account. Run `/link` to connect one.",
    whoisOtherNotLinked: (mention) => `${mention} has not linked a Tinyburg account.`,
    whoisSelfLinked: (name) => `You have linked **${name}**.`,
    whoisOtherLinked: (mention, name) => `${mention} has linked **${name}**.`,
    notLinked: "This Discord account is not linked to a Tinyburg account.",
    unlinked: "Unlinked. Your Tinyburg account no longer answers to this Discord account.",
    linkedFollowUp: (name) => `Linked to **${name}**.`,
    fallbackYourAccountName: "your Tinyburg account",
    linkedTitle: "Linked",
    linkedBody: (name) =>
        `Your Tinyburg account <strong>${name}</strong> is now linked to Discord. You can close this tab and go back.`,
    failedTitle: "Could not link",
    failedBody:
        "That link did not work. It may have expired or already been used. Run <strong>/link</strong> in Discord to start again.",
    cancelledTitle: "Not linked",
    cancelledBody: "Nothing was linked. You can run <strong>/link</strong> in Discord if you change your mind.",
};

// German. Register: formal "Sie". Every template that can receive
// `fallbackAccountName` phrases the account as "mit ... verknüpft" so the
// dative "einem Tinyburg-Konto" fits each slot.
const de: BotMessages = {
    unknownInvoker: "Ich konnte nicht erkennen, wer diesen Befehl ausgeführt hat.",
    alreadyLinked: (name) =>
        `Dieses Discord-Konto ist bereits mit **${name}** verknüpft. Führen Sie zuerst \`/unlink\` aus.`,
    fallbackAccountName: "einem Tinyburg-Konto", // REVIEW: declined for the dative slots ("mit ... verknüpft") it is interpolated into
    linkPrompt: [
        "Melden Sie sich auf tinyburg.app an, um Ihr Konto zu verknüpfen. Dieser Link funktioniert nur einmal und läuft in 10 Minuten ab.",
        "",
        "Er bestätigt nur, wer Sie sind: Ihre Türme bleiben privat, bis Sie den Zugriff separat gewähren.",
    ].join("\n"),
    linkButtonLabel: "Mein Tinyburg-Konto verknüpfen",
    whoisSelfNotLinked: "Sie haben kein Tinyburg-Konto verknüpft. Führen Sie `/link` aus, um eines zu verbinden.",
    whoisOtherNotLinked: (mention) => `${mention} hat kein Tinyburg-Konto verknüpft.`,
    whoisSelfLinked: (name) => `Sie sind mit **${name}** verknüpft.`,
    whoisOtherLinked: (mention, name) => `${mention} ist mit **${name}** verknüpft.`,
    notLinked: "Dieses Discord-Konto ist mit keinem Tinyburg-Konto verknüpft.",
    unlinked: "Verknüpfung aufgehoben. Ihr Tinyburg-Konto ist nicht mehr mit diesem Discord-Konto verbunden.", // REVIEW: the English "no longer answers to" whimsy is flattened
    linkedFollowUp: (name) => `Mit **${name}** verknüpft.`,
    fallbackYourAccountName: "Ihrem Tinyburg-Konto", // REVIEW: declined for the dative slots ("Mit ... verknüpft"); reads doubled inside linkedBody, as in English
    linkedTitle: "Verknüpft",
    linkedBody: (name) =>
        `Ihr Tinyburg-Konto <strong>${name}</strong> ist jetzt mit Discord verknüpft. Sie können diesen Tab schließen und zurückkehren.`,
    failedTitle: "Verknüpfung fehlgeschlagen",
    failedBody:
        "Dieser Link hat nicht funktioniert. Er ist möglicherweise abgelaufen oder wurde bereits verwendet. Führen Sie <strong>/link</strong> in Discord aus, um neu zu beginnen.",
    cancelledTitle: "Nicht verknüpft",
    cancelledBody:
        "Es wurde nichts verknüpft. Sie können <strong>/link</strong> in Discord ausführen, falls Sie es sich anders überlegen.",
};

// Spanish. Register: informal "tú".
const es: BotMessages = {
    unknownInvoker: "No pude saber quién ejecutó ese comando.",
    alreadyLinked: (name) => `Esta cuenta de Discord ya está vinculada a **${name}**. Ejecuta \`/unlink\` primero.`,
    fallbackAccountName: "una cuenta de Tinyburg",
    linkPrompt: [
        "Inicia sesión en tinyburg.app para vincular tu cuenta. Este enlace funciona una sola vez y caduca en 10 minutos.",
        "",
        "Solo pide confirmar quién eres: tus torres siguen siendo privadas hasta que concedas ese acceso por separado.",
    ].join("\n"),
    linkButtonLabel: "Vincular mi cuenta de Tinyburg",
    whoisSelfNotLinked: "No has vinculado una cuenta de Tinyburg. Ejecuta `/link` para conectar una.",
    whoisOtherNotLinked: (mention) => `${mention} no ha vinculado una cuenta de Tinyburg.`,
    whoisSelfLinked: (name) => `Has vinculado **${name}**.`,
    whoisOtherLinked: (mention, name) => `${mention} ha vinculado **${name}**.`,
    notLinked: "Esta cuenta de Discord no está vinculada a una cuenta de Tinyburg.",
    unlinked: "Cuenta desvinculada. Tu cuenta de Tinyburg ya no responde a esta cuenta de Discord.",
    linkedFollowUp: (name) => `Vinculada a **${name}**.`, // REVIEW: feminine agrees with "cuenta"
    fallbackYourAccountName: "tu cuenta de Tinyburg",
    linkedTitle: "Cuenta vinculada",
    linkedBody: (name) =>
        `Tu cuenta de Tinyburg <strong>${name}</strong> ya está vinculada a Discord. Puedes cerrar esta pestaña y volver.`,
    failedTitle: "No se pudo vincular",
    failedBody:
        "Ese enlace no funcionó. Puede que haya caducado o que ya se haya usado. Ejecuta <strong>/link</strong> en Discord para empezar de nuevo.",
    cancelledTitle: "Sin vincular",
    cancelledBody: "No se vinculó nada. Puedes ejecutar <strong>/link</strong> en Discord si cambias de opinión.",
};

// French. Register: informal "tu".
const fr: BotMessages = {
    unknownInvoker: "Je n'ai pas pu déterminer qui a lancé cette commande.",
    alreadyLinked: (name) => `Ce compte Discord est déjà lié à **${name}**. Lance d'abord \`/unlink\`.`,
    fallbackAccountName: "un compte Tinyburg",
    linkPrompt: [
        "Connecte-toi sur tinyburg.app pour lier ton compte. Ce lien ne fonctionne qu'une seule fois et expire dans 10 minutes.",
        "",
        "Il sert uniquement à confirmer qui tu es : tes tours restent privées tant que tu n'accordes pas cet accès séparément.",
    ].join("\n"),
    linkButtonLabel: "Lier mon compte Tinyburg",
    whoisSelfNotLinked: "Tu n'as pas lié de compte Tinyburg. Lance `/link` pour en connecter un.",
    whoisOtherNotLinked: (mention) => `${mention} n'a pas lié de compte Tinyburg.`,
    whoisSelfLinked: (name) => `Tu as lié **${name}**.`,
    whoisOtherLinked: (mention, name) => `${mention} a lié **${name}**.`,
    notLinked: "Ce compte Discord n'est lié à aucun compte Tinyburg.",
    unlinked: "Compte délié. Ton compte Tinyburg ne répond plus à ce compte Discord.", // REVIEW: "délié" is a guess for "unlinked"; "dissocié" may read better
    linkedFollowUp: (name) => `Lié à **${name}**.`,
    fallbackYourAccountName: "ton compte Tinyburg",
    linkedTitle: "Compte lié",
    linkedBody: (name) =>
        `Ton compte Tinyburg <strong>${name}</strong> est maintenant lié à Discord. Tu peux fermer cet onglet et revenir en arrière.`,
    failedTitle: "Échec de la liaison", // REVIEW: guessed phrasing for "Could not link"
    failedBody:
        "Ce lien n'a pas fonctionné. Il a peut-être expiré ou déjà été utilisé. Lance <strong>/link</strong> dans Discord pour recommencer.",
    cancelledTitle: "Non lié",
    cancelledBody: "Rien n'a été lié. Tu peux lancer <strong>/link</strong> dans Discord si tu changes d'avis.",
};

export const botMessagesFor: Record<Language, BotMessages> = { de, en, es, fr };

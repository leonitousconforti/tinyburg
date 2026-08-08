/**
 * Spanish, informal register ("tú") throughout. Kept in English: Tinyburg,
 * TinyTower, tinyburg.app, Social Circles (the study's name), and the in-game
 * setting name "Only Friend Visits". Ordinary words like towers, floors and
 * friends translate normally.
 */

import type { Messages } from "./types.ts";

export const es: Messages = {
    titles: {
        // REVIEW: subtitle phrasing for "An Opt-In Friend Network Study".
        home: "TinyTower Social Circles | Un estudio voluntario de redes de amigos",
        login: "Iniciar sesión | Social Circles",
        towers: "Tus torres | Social Circles",
        privacy: "Qué compartirías | Social Circles",
        notFound: "Página no encontrada | Social Circles",
    },

    home: {
        title: "TinyTower Social Circles",
        tagline: "Un estudio voluntario sobre cómo se conectan los jugadores de TinyTower.",
        permissionTitle: "Nada sin permiso",
        permissionBody:
            "Tu lista de amigos no se lee hasta que inicias sesión y dices que sí, para esa torre en concreto. Puedes parar y borrarlo todo en cualquier momento.",
        connectionTitle: "Una conexión necesita a las dos personas",
        connectionBody:
            "Solo registramos una amistad cuando ambos jugadores se han unido. Si tu amigo no lo ha hecho, esa conexión nunca se guarda, ni siquiera como pista.",
        botTitle: "Sin necesidad de agregar un bot",
        // REVIEW: "Only Friend Visits" kept in English; the game may localize it.
        botBody:
            'Las versiones anteriores de este estudio requerían agregar una cuenta bot como amigo. Eso ya no existe. El permiso viaja a través de tu cuenta de Tinyburg, así que puedes dejar activado "Only Friend Visits".',
        yourTowers: "Tus torres →",
        signIn: "Inicia sesión con Tinyburg",
        whatYoudShare: "Qué compartirías",
    },

    login: {
        backToHome: "← Volver al inicio",
        heading: "Social Circles",
        intro: "Iniciar sesión es cómo sabemos que una torre es realmente tuya. No se recoge nada hasta que tú lo digas, torre por torre.",
        cancelled: "Se canceló el inicio de sesión. No se compartió nada, y puedes retomarlo cuando quieras.",
        interrupted:
            "Ese intento de inicio de sesión caducó o se interrumpió. Empieza de nuevo y comprueba que tu navegador permite cookies para este sitio.",
        failed: "No pudimos terminar de iniciar tu sesión. Inténtalo de nuevo.",
        signInWithTinyburg: "Inicia sesión con Tinyburg",
        noAccountPrefix: "¿Aún no tienes cuenta de Tinyburg? ",
        createAccount: "Crea una en tinyburg.app",
        noAccountSuffix: " primero.",
    },

    notFound: {
        heading: "Página no encontrada",
        body: "No hay ningún piso en esta dirección.",
        backToLobby: "Volver al vestíbulo",
    },

    towers: {
        loadFailed:
            "No pudimos conectar con tinyburg.app para comprobar qué torres son tuyas. Intenta iniciar sesión de nuevo; si sigue pasando, puede que el proveedor esté caído.",
        actionFailed: "Eso no funcionó. Inténtalo de nuevo.",
        enrollForbidden:
            "tinyburg.app no pudo confirmar que esa torre es tuya. Asegúrate de que sigue vinculada a tu cuenta de Tinyburg.",
        withdrawNotFound: "Esa torre no participa, así que no había nada que eliminar.",
        enrolledCrawled: "Ya estás participando. Tu círculo está abajo.",
        enrolledPending:
            "Ya estás participando. No pudimos leer tu torre ahora mismo, así que tu círculo aparecerá después de la próxima pasada programada.",
        withdrawn: (eventsRemoved) =>
            `Eliminado. Se ${eventsRemoved === 1 ? "borró 1 registro" : `borraron ${eventsRemoved} registros`} sobre ti, y ya no formas parte del estudio.`,

        notReadYet: "aún sin leer",
        lastRead: (date) => `última lectura: ${date}`,
        inTheStudy: (lastCrawled) => `En el estudio · ${lastCrawled}`,
        circleSummary: (circleSize, totalFriends, lastCrawled) =>
            `${circleSize} de tus ${totalFriends} amigos también ${circleSize === 1 ? "participa" : "participan"} · ${lastCrawled}`,
        takingPart: "Participa",
        notTakingPart: "No participa",
        joiningShares:
            "Unirte comparte solo tu lista de amigos, y solo las conexiones en las que la otra persona también se ha unido.",
        seeMyCircle: "Ver mi círculo",
        withdrawTitle: "Retirarse y borrar todo lo que el estudio guarda sobre esta torre",
        reallyLeave: "¿Seguro que quieres salir y borrar?",
        leaveAndDelete: "Salir y borrar mis datos",
        joining: "Uniéndote...",
        takePart: "Participar",

        yourCircle: "Tu círculo",
        hide: "Ocultar",
        emptyCircle:
            "Nadie de tu lista de amigos se ha unido todavía. Una conexión solo aparece cuando ambas personas participan.",

        noLinkedTowers: "Todavía no has vinculado una cuenta de TinyTower a tu cuenta de Tinyburg.",
        linkingExplains: "Vincular es cómo sabemos que una torre es realmente tuya. ",
        linkOne: "Vincula una en tinyburg.app",
        thenComeBack: " y luego vuelve.",

        heading: "Tus torres",
        headingBody:
            "Cada torre decide por sí misma. Participar comparte la lista de amigos de esa torre; salir borra todo lo que el estudio guarda sobre ella.",
        loading: "Cargando tus torres...",
        yourSocialCircles: "Tus círculos sociales",
        namedSocialCircles: (name) => `Círculos sociales de ${name}`,
        signOut: "Cerrar sesión",
        privacyPrefix: "Qué recogemos y por qué está explicado en la ",
        privacyLink: "página de privacidad",
        privacySuffix: ".",
    },
};

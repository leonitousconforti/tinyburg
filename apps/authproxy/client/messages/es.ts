/**
 * Spanish messages. Register: informal "tú".
 *
 * Kept in English (glossary): Tinyburg, TinyTower, Nimblebit, Authproxy,
 * bitizen(s), bux, Discord, and technical terms the API surface owns (scope,
 * token bearer, SDK, gzip). "Towers"/"floors"/"friends" translate normally.
 */

import type { Messages } from "./types.ts";

export const es: Messages = {
    titles: {
        home: "Tinyburg Authproxy | Claves de API para los servidores de Nimblebit",
        login: "Iniciar sesión | Tinyburg Authproxy",
        keys: "Tus claves de API | Tinyburg Authproxy",
        admin: "Admin | Tinyburg Authproxy",
        notFound: "Página no encontrada | Tinyburg Authproxy",
    },
    shared: {
        backToHome: "← Volver al inicio",
        cancel: "Cancelar",
        delete: "Eliminar",
        rateLimit: (limit, windowSeconds) => `${limit} solicitudes / ${windowSeconds}s`,
        reallyDelete: "¿Eliminar de verdad?",
        reEnable: "Reactivar",
        revoke: "Revocar",
        revokedBadge: "Revocada",
    },
    home: {
        title: "Tinyburg Authproxy",
        tagline: "Acceso autenticado y con límite de solicitudes a los servidores de TinyTower de Nimblebit.",
        manageKeys: "Gestiona tus claves de API →",
        signIn: "Inicia sesión con Tinyburg →",
        howItWorksHeading: "Cómo funciona",
        howItWorksIntro:
            "El proxy firma tus solicitudes antes de reenviarlas a Nimblebit, así que nunca tocas salts ni hashes. Autentícate con una clave de API como token bearer:",
        howItWorksScopes:
            "Cada clave lleva scopes, uno por familia de endpoints, y su propio límite de solicitudes. Inicia sesión con tu cuenta de Tinyburg para crear tú mismo claves de solo lectura, ver las claves que tienes y rotar las que se filtren.",
        sdkHeading: "Usa el SDK",
        sdkIntroBefore: "Este proxy sirve las mismas definiciones de endpoints a partir de las cuales está construido ",
        sdkIntroAfter:
            ", así que un cliente TypeScript tipado sale gratis. Decodifica partidas guardadas, amigos, regalos, visitas y sorteos en tipos reales, y ya sabe apuntarse hacia aquí:",
        // REVIEW: "Nimblebit soup" is playful in the original; kept the image.
        sdkOutro:
            "AUTH_KEY es la clave del proxy que creaste aquí; PLAYER_ID y PLAYER_AUTH_KEY nombran la torre en cuyo nombre actúas. Las partidas descargadas llegan como sopa de Nimblebit comprimida con gzip: pásalas al esquema SaveData del SDK y obtendrás pisos, bitizens, misiones y amigos como valores tipados normales.",
        testKeysHeading: "Claves de prueba públicas",
        testKeysIntro: "Existen dos claves compartidas para probar. Tienen límite de solicitudes por dirección IP:",
        testKeysOutro:
            "Las claves personales tienen límite por clave y empiezan con 10 solicitudes por minuto. ¿Necesitas scopes de escritura o un límite mayor? Escríbenos en Discord.",
        footerBefore: "Parte de ",
        footerAfter: ", sin afiliación con Nimblebit.",
    },
    login: {
        // REVIEW: "Self Service" rendered as "autoservicio"; may read like a shop.
        heading: "Autoservicio de Authproxy",
        subheading: "Tu cuenta de Tinyburg es tu identidad aquí: un solo inicio de sesión, sin contraseña nueva.",
        signInWithTinyburg: "Inicia sesión con Tinyburg",
        noAccountBefore: "¿Aún no tienes cuenta de Tinyburg? ",
        createAccountLink: "Crea una en tinyburg.app",
        noAccountAfter: " primero.",
        cancelled: "Cancelaste el inicio de sesión. Puedes retomarlo cuando quieras.",
        interrupted:
            "Ese intento de inicio de sesión caducó o se interrumpió. Empieza de nuevo y comprueba que tu navegador permite cookies para este sitio.",
        failed: "No pudimos terminar de iniciar tu sesión. Inténtalo de nuevo.",
    },
    keys: {
        heading: "Tus claves de API",
        headingFor: (name) => `Claves de API de ${name}`,
        signOut: "Cerrar sesión",
        sectionHeading: "Tus claves de API",
        sectionIntro: "Rota cualquier clave que se te haya podido filtrar y elimina las que ya no uses.",
        loading: "Cargando tus claves...",
        loadFailed: "No pudimos cargar tus claves. Inténtalo de nuevo.",
        emptyState: "Aún no hay claves. Crea una y empieza a llamar al proxy.",
        newKey: "+ Nueva clave",
        maxKeysTitle: (maxKeys) => `Cada cuenta puede tener como máximo ${maxKeys} claves`,
        provisionTitle: "Crear una clave nueva",
        copy: "Copiar",
        rotate: "Rotar",
        rotateTitle: "Emite una clave nueva para esta fila; la antigua deja de funcionar de inmediato",
        createdLastUsed: (created, lastUsed) => `Creada el ${created} · Último uso el ${lastUsed}`,
        descriptionLabel: "¿Para qué es esta clave?",
        descriptionPlaceholder: "Descripción opcional, p. ej. mi bot de estadísticas de torres",
        readOnlyScopesLabel: "Scopes de solo lectura (elige al menos uno)",
        writeScopesNote: "Los scopes de escritura se conceden a mano: escríbenos en Discord",
        createKey: "Crear clave",
        notices: {
            copied: "Copiada a tu portapapeles.",
            created: "Clave creada. Funciona de inmediato.",
            rotated: "Clave rotada. La antigua dejó de funcionar en el momento en que se emitió la nueva.",
            revoked: "Clave revocada. Las solicitudes con ella ahora fallan.",
            reEnabled: "Clave reactivada.",
            deleted: "Clave eliminada.",
        },
        problems: {
            actionFailed: "Eso no funcionó. Inténtalo de nuevo.",
            createRefused: (maxKeys) =>
                `Esa solicitud fue rechazada. Las claves necesitan al menos un scope y cada cuenta puede tener como máximo ${maxKeys} claves.`,
            clipboardFailed: "No pudimos acceder a tu portapapeles. Inténtalo de nuevo.",
        },
    },
    admin: {
        heading: "Admin",
        yourKeysLink: "Tus claves",
        // REVIEW: "step up" rendered as raising privileges; no snappy Spanish idiom.
        stepUpHeading: "Elevar permisos",
        stepUpIntro:
            "Las acciones de admin necesitan más que una sesión: introduces la contraseña de admin y vuelves a autorizar con Tinyburg para que el proxy pueda comprobar, con tu consentimiento, que tu cuenta tiene una torre en la lista de permitidos. La elevación dura una hora.",
        passwordPlaceholder: "Contraseña de admin",
        // REVIEW: mirrors "Elevate with Tinyburg"; reads unusual in Spanish too.
        elevate: "Elevar con Tinyburg",
        allKeysHeading: "Todas las claves",
        allKeysIntro:
            "Todas las claves que el proxy ha emitido, las tenga quien las tenga. Los scopes de escritura se conceden aquí.",
        loading: "Cargando...",
        loadFailed: "No pudimos cargar las claves. Inténtalo de nuevo.",
        emptyState: "Todavía no existe ninguna clave.",
        owner: (sub) => `Propietario ${sub}`,
        noOwner: "Sin propietario (emitida por un admin)",
        scopesButton: "Scopes",
        rateLimitButton: "Límite de solicitudes",
        saveScopes: "Guardar scopes",
        saveLimit: "Guardar límite",
        requestsLabel: "Solicitudes",
        // REVIEW: matches the quirky English "per seconds" next to the window field.
        perSecondsLabel: "por segundos",
        notices: {
            saved: "Guardado.",
            keyDeleted: "Clave eliminada.",
        },
        problems: {
            elevationFailed:
                "La elevación fue rechazada. Comprueba la contraseña, que aprobaste la comprobación de la torre y que tu cuenta tiene una torre en la lista de permitidos.",
            actionFailed: "Eso no funcionó. Inténtalo de nuevo.",
            rateLimitInvalid: "Los límites de solicitudes necesitan números enteros positivos.",
        },
    },
    notFound: {
        heading: "404",
        body: "Este piso todavía no se ha construido.",
    },
};

import type { Messages } from "./types.ts";

/**
 * Spanish. Register: informal "tú" throughout.
 *
 * Glossary kept in English: Tinyburg, TinyTower, bitizen(s), bux, brand and
 * provider names (Google, Discord, GitHub, Reddit, NimbleBit). "Floors",
 * "towers" and "friends" translate normally (pisos, torres, amigos).
 */
export const es: Messages = {
    shared: {
        back: "Volver",
        backToHome: "← Volver al inicio",
        floors: {
            food: "🍕 Comida",
            retail: "🛍️ Tiendas",
            service: "✂️ Servicios",
            creative: "🎨 Creativo",
            recreation: "🎮 Ocio",
            residential: "🛏️ Residencial",
            lobby: "🚪 Vestíbulo",
        },
    },
    titles: {
        home: "Intercambios de TinyTower | Intercambia bitizens, disfraces y más",
        about: "Acerca de | Tinyburg",
        login: "Iniciar sesión | Tinyburg",
        privacy: "Política de privacidad | Tinyburg",
        terms: "Términos del servicio | Tinyburg",
        sponsors: "Patrocinadores | Tinyburg",
        developers: "Desarrolladores | Tinyburg",
        developerApps: "Aplicaciones OAuth | Tinyburg",
        towerMe: "Mis torres | Tinyburg",
        towerLink: "Vincula tu torre | Tinyburg",
        account: "Cuenta y seguridad | Tinyburg",
        notFound: "Página no encontrada | Tinyburg",
    },
    home: {
        nav: {
            browseTrades: "Ver intercambios",
            bitizens: "Bitizens",
            costumes: "Disfraces",
            about: "Acerca de",
        },
        logIn: "Iniciar sesión",
        heroTitle: "Intercambios de TinyTower",
        heroTagline:
            "El mercado de la comunidad para intercambiar bitizens, disfraces, mascotas y más con jugadores de TinyTower de todo el mundo",
        startTrading: "Empieza a intercambiar",
        learnMore: "Saber más",
        featuresHeading: "¿Qué puedes intercambiar?",
        features: {
            tradeBitizens: {
                title: "Intercambia bitizens",
                description: "Encuentra bitizens con su empleo soñado para tu torre o intercambia tus duplicados",
            },
            costumesPets: {
                title: "Disfraces y mascotas",
                description: "Colecciona disfraces raros y mascotas adorables para tus bitizens",
            },
            goldenTickets: {
                title: "Tickets dorados",
                description: "Intercambia recursos y ayuda a otros constructores de torres",
            },
            community: {
                title: "Comunidad",
                description: "Conecta con miles de jugadores activos de TinyTower",
            },
        },
        stats: {
            activeTraders: "Jugadores activos",
            tradesCompleted: "Intercambios completados",
            bitizensTraded: "Bitizens intercambiados",
        },
        ctaHeading: "¿Listo para construir la torre de tus sueños?",
        ctaBody: "Únete a miles de jugadores que intercambian bitizens y objetos cada día",
        ctaButton: "Empieza gratis",
        footerAbout: {
            before: "Una plataforma de intercambios impulsada por la comunidad para fans de TinyTower. Sin afiliación con NimbleBit. El código fuente está disponible en ",
            linkLabel: "GitHub",
            after: ".",
        },
        quickLinks: "Enlaces rápidos",
        community: "Comunidad",
        legal: "Legal",
        sponsors: "Patrocinadores",
        privacyPolicy: "Política de privacidad",
        termsOfService: "Términos del servicio",
        copyright: "© 2026 Tinyburg. TinyTower es una marca de NimbleBit LLC.",
    },
    about: {
        title: "Acerca de Tinyburg",
        // REVIEW: tone-sensitive tagline.
        tagline: "Creando conexiones, bitizen a bitizen",
        whatIsHeading: "¿Qué es Tinyburg?",
        whatIsBody:
            "Tinyburg es una plataforma de intercambios creada por la comunidad de fans de TinyTower. Te facilitamos encontrar bitizens con su empleo soñado, intercambiar disfraces raros y conectar con constructores de torres de todo el mundo.",
        missionHeading: "Nuestra misión",
        missions: {
            findDreamJobbers: {
                title: "Encuentra empleados soñados",
                description:
                    "Deja de esperar bitizens al azar. Busca en nuestra base de datos los bitizens perfectos de 9 puntos con su empleo soñado para tus pisos.",
            },
            connectPlayers: {
                title: "Conecta jugadores",
                description:
                    "Construir una torre es más divertido en compañía. Conecta con miles de jugadores activos listos para intercambiar y echarse una mano.",
            },
            collectEverything: {
                title: "Coléccionalo todo",
                description: "De disfraces raros a mascotas adorables, intercambia hasta completar tu colección.",
            },
        },
        howHeading: "Cómo funciona",
        steps: {
            signUp: {
                title: "Regístrate",
                description: "Crea tu cuenta con Google o Discord en segundos",
            },
            linkTower: {
                title: "Vincula tu torre",
                description: "Usa la sincronización en la nube de Nimblebit para vincular tu torre",
            },
            browseTrade: {
                title: "Explora e intercambia",
                description: "Encuentra lo que necesitas y conecta con otros jugadores",
            },
            buildDream: {
                title: "Construye la torre de tus sueños",
                description: "Llena cada piso con empleados soñados y objetos raros",
            },
        },
        communityHeading: "La comunidad primero",
        communityBody:
            "Tinyburg está creado y mantenido por jugadores apasionados de TinyTower. No estamos afiliados a NimbleBit, pero compartimos su amor por los píxeles pequeños y las torres altas. Nuestro objetivo es hacer que la comunidad de TinyTower esté aún más conectada y sea más colaborativa.",
        joinDiscord: "Únete a nuestro Discord",
        openSourceHeading: "Código abierto",
        openSourceBody:
            "Tinyburg es un proyecto de código abierto. Creemos en la transparencia y en las contribuciones de la comunidad. Revisa nuestro código, informa de errores o aporta funcionalidades en GitHub.",
        viewOnGithub: "Ver en GitHub",
        ourSponsors: "Nuestros patrocinadores",
        faqHeading: "Preguntas frecuentes",
        faqs: {
            free: {
                question: "P: ¿Tinyburg es gratis?",
                answer: "R: ¡Sí! Tinyburg es completamente gratis. Somos un proyecto comunitario creado por jugadores que aman el juego.",
            },
            affiliated: {
                question: "P: ¿Está afiliado a NimbleBit?",
                answer: "R: No, Tinyburg es un proyecto de fans independiente. No estamos afiliados, respaldados ni conectados con NimbleBit LLC de ninguna manera.",
            },
            trades: {
                question: "P: ¿Cómo funcionan los intercambios?",
                answer: "R: Tinyburg te ayuda a encontrar jugadores y coordinar los intercambios. El intercambio en sí puede hacerse por distintos métodos según los objetos, como enviar regalos o modificar los datos de guardado.",
            },
            dataSafe: {
                question: "¿Mis datos están seguros?",
                before: "Solo recopilamos lo necesario para ofrecer el servicio. Consulta nuestra ",
                linkLabel: "Política de privacidad",
                after: " para conocer todos los detalles.",
            },
        },
    },
    login: {
        heading: "Bienvenido a Tinyburg",
        subheading: "Inicia sesión o crea una cuenta para empezar",
        problems: {
            denied: "El inicio de sesión se canceló. Puedes retomarlo cuando quieras.",
            expired:
                "Ese intento de inicio de sesión caducó o se interrumpió. Empieza de nuevo y comprueba que tu navegador permite cookies para este sitio.",
            failed: "No pudimos completar tu inicio de sesión. Inténtalo de nuevo.",
        },
        continueWithGoogle: "Continuar con Google",
        continueWithDiscord: "Continuar con Discord",
        perks: {
            dreamJobs: "Encuentra bitizens con su empleo soñado",
            trade: "Intercambia con miles de jugadores",
            collect: "Colecciona disfraces raros y mascotas",
        },
        agreeBefore: "Al continuar, aceptas nuestros ",
        termsOfService: "Términos del servicio",
        agreeAnd: " y nuestra ",
        privacyPolicy: "Política de privacidad",
    },
    account: {
        backToTowers: "← Volver a mis torres",
        heading: (name) => `Cuenta de ${name}`,
        notices: {
            connected: "Conectada. Ya puedes iniciar sesión con ella.",
            alreadyConnected: "Esa cuenta ya estaba conectada.",
            disconnected: "Desconectada.",
            linkCancelled: "La conexión de esa cuenta se canceló.",
        },
        signedOutSessions: (count) => (count === 1 ? "Se cerró 1 sesión." : `Se cerraron ${count} sesiones.`),
        problems: {
            linkExpired: "Ese intento caducó o se interrumpió. Intenta conectarla de nuevo.",
            linkFailed: "No pudimos conectar esa cuenta. Inténtalo de nuevo.",
            accountTaken: "Esa cuenta ya está conectada a otra cuenta de Tinyburg.",
            actionFailed: "Eso no funcionó. Inténtalo de nuevo.",
            lastSignInMethod: "Es tu única forma de iniciar sesión, así que debe seguir conectada.",
        },
        loadFailed: "No pudimos cargar esto. Inténtalo de nuevo.",
        sessionsHeading: "Dónde tienes la sesión iniciada",
        sessionsBody: "Cada navegador con una sesión de esta cuenta. Cierra la sesión en cualquiera que no reconozcas.",
        loadingSessions: "Cargando tus sesiones...",
        unknownDevice: "Dispositivo desconocido",
        deviceOn: (browser, platform) => `${browser} en ${platform}`,
        thisDevice: "Este dispositivo",
        lastActive: (when) => `Última actividad: ${when}`,
        signedInOn: (date) => `Sesión iniciada el ${date}`,
        signOut: "Cerrar sesión",
        signOutThisBrowser: "Cerrar sesión en este navegador",
        signOutOf: (name) => `Cerrar sesión en ${name}`,
        noOtherSessions: "No hay otras sesiones",
        signOutOthers: (count) => (count === 1 ? "Cerrar la otra sesión" : `Cerrar las otras ${count} sesiones`),
        signOutEverywhere: "Cerrar sesión en todas partes",
        methodsHeading: "Métodos de inicio de sesión",
        methodsBody: "Conecta más formas de iniciar sesión para poder volver siempre a esta cuenta.",
        loading: "Cargando...",
        disconnect: "Desconectar",
        disconnectProvider: (provider) => `Desconectar ${provider}`,
        lastMethodTitle: "Es la única forma que te queda de iniciar sesión",
        connect: "Conectar →",
    },
    developers: {
        title: "Tinyburg para desarrolladores",
        tagline: "Deja que los jugadores lleven su cuenta de Tinyburg a tu app",
        signInHeading: "Sign in with Tinyburg",
        signInBody:
            "Tinyburg es un proveedor de OpenID Connect. ¿Estás creando una herramienta complementaria, un panel para un bot de Discord o cualquier otra cosa para la comunidad de TinyTower? Registra una aplicación OAuth y los jugadores podrán iniciar sesión con la misma cuenta que usan para intercambiar, sin contraseñas nuevas.",
        features: {
            standardOidc: {
                title: "OIDC estándar",
                description:
                    "Flujo de código de autorización con PKCE y tokens de identidad firmados con ES256. Cualquier biblioteca cliente de OpenID Connect funciona sin más.",
            },
            minimalScopes: {
                title: "Scopes mínimos",
                description:
                    "Las apps solo ven la identidad, el nombre visible y el avatar del jugador. Nada más sale de Tinyburg.",
            },
            playerConsent: {
                title: "Consentimiento del jugador",
                description:
                    "Los jugadores aprueban exactamente lo que tu app puede ver en una pantalla de consentimiento antes de emitirse ningún token.",
            },
        },
        gettingStartedHeading: "Primeros pasos",
        steps: {
            logIn: {
                title: "Inicia sesión en Tinyburg",
                description: "Necesitas una cuenta de Tinyburg para registrar aplicaciones",
            },
            register: {
                title: "Registra tu aplicación",
                description: "Ponle un nombre y tus URIs de redirección, y obtén tu client id y tu secreto",
            },
            point: {
                title: "Apunta tu biblioteca OIDC hacia nosotros",
                description:
                    "La mayoría de bibliotecas solo necesitan la URL de discovery de abajo para configurarse solas",
            },
            signIn: {
                title: "Los jugadores inician sesión",
                description: "Aprueban tu app una vez y vuelven a tu URI de redirección",
            },
        },
        redirectNote:
            "Las URIs de redirección deben usar https, salvo localhost mientras desarrollas. Los secretos de cliente se muestran una sola vez al registrarte y se guardan con hash, así que guarda el tuyo en un lugar seguro.",
        endpointsHeading: "Endpoints",
        endpointsBody:
            "Todo lo de abajo también se publica en el documento de discovery, así que la mayoría de configuraciones solo necesitan la primera URL.",
        endpointNames: {
            jwks: "JWKS",
            discovery: "Discovery",
            authorization: "Autorización",
            token: "Token",
            userinfo: "Userinfo",
        },
        scopesHeading: "Scopes",
        scopeDescriptions: {
            openid: "Confirmar tu identidad de Tinyburg",
            profile: "Ver tu nombre visible y tu avatar",
        },
        readyHeading: "¿Listo para construir?",
        readyBefore:
            "Registra tu primera aplicación y empieza a iniciar sesión a jugadores. ¿Dudas o atascado en algo? Pregunta en el ",
        discordLinkLabel: "Discord de Tinyburg",
        readyAfter: " y te ayudaremos.",
        yourApplications: "Tus aplicaciones",
        discoveryDocument: "Documento de discovery",
    },
    developerApps: {
        heading: "Aplicaciones OAuth",
        comingSoon: "El registro autoservicio está en camino",
        comingSoonDetail:
            "Sign in with Tinyburg ya funciona. Pregunta en el Discord y mientras tanto registraremos tu aplicación a mano.",
        readGuide: "← Lee la guía de integración",
    },
    sponsors: {
        title: "¡Gracias, patrocinadores!",
        // REVIEW: figurative tagline.
        tagline: "Las personas que mantienen las luces encendidas en cada piso",
        intro: "Tinyburg es gratis, de código abierto y lo mantienen voluntarios. Los servidores, la base de datos y el depósito que custodia cada intercambio los pagan las personas generosas de esta página que patrocinan el proyecto en GitHub. Cada una de ellas hace la torre un poco más alta.",
        becomeSponsor: "Hazte patrocinador",
        currentHeading: "Patrocinadores actuales",
        noSponsors: "Aún no hay patrocinadores. ¡Sé el primer bitizen de este piso!",
        pastHeading: "Patrocinadores anteriores",
        pastBody: "Quien fue patrocinador, siempre será apreciado. ¡Gracias por ayudar en el camino!",
        otherWaysHeading: "Otras formas de ayudar",
        otherWaysBody:
            "Patrocinar no es la única forma de apoyar a Tinyburg. Informa de errores, aporta una funcionalidad o simplemente pasa el rato y ayuda a otros constructores de torres en la comunidad.",
        starOnGithub: "Dale una estrella en GitHub",
        joinDiscord: "Únete a nuestro Discord",
    },
    towerLink: {
        backToTowers: "← Mis torres",
        heading: "Vincula tu torre",
        subheading:
            "Conecta tu guardado en la nube de TinyTower para empezar a intercambiar con jugadores de todo el mundo",
        step1: "Paso 1 de 2",
        step2: "Paso 2 de 2",
        friendCodeLabel: "Código de amigo",
        friendCodeTitle: "Hasta 5 letras o números",
        friendCodeHint: "Lo encontrarás en la pestaña Amigos de TinyTower",
        emailLabel: "Correo de sincronización en la nube",
        emailHint:
            "El correo con el que está registrado tu guardado en la nube. Nimblebit enviará ahí un código de verificación.",
        sending: "Enviando...",
        sendCode: "Enviar código de verificación",
        sentCodeBefore: "📬 Nimblebit envió un código de verificación a ",
        sentCodeAfter: ". Puede tardar un minuto en llegar.",
        codeLabel: "Código de verificación",
        codeHint: "¿No llega el correo? Revisa tu carpeta de spam",
        linked: "¡Vinculada! Redirigiendo...",
        verifying: "Verificando...",
        linkMyTower: "Vincular mi torre",
        goBack: "← Volver",
        sent: "¡Enviado!",
        resend: "Reenviar correo",
        errors: {
            requestFailed: "No pudimos contactar con tu torre. Comprueba tu código de amigo e inténtalo de nuevo.",
            verifyFailed: "Ese código no funcionó. Compruébalo e inténtalo de nuevo, o reenvía el correo.",
            resendFailed: "No pudimos reenviar el correo. Inténtalo de nuevo en un momento.",
        },
    },
    towerMe: {
        avatarAlt: (name) => `Avatar de ${name}`,
        // REVIEW: playful title.
        mayor: "🏙️ Alcalde de Tinyburg",
        signOut: "Cerrar sesión",
        towersHeading: "Mis torres",
        linkATower: "+ Vincular una torre",
        noTowers: "Aún no hay torres vinculadas",
        noTowersDetailLong:
            "Vincula tu guardado de TinyTower para sincronizar tus bitizens y empezar a intercambiar con jugadores de todo el mundo.",
        noTowersDetailShort: "Vincula tu guardado de TinyTower para empezar a intercambiar.",
        loadingTowers: "Cargando tus torres...",
        towersLoadFailed: "No pudimos cargar tus torres. Inténtalo de nuevo.",
        linkedOn: (date) => `Vinculada el ${date}`,
        accountRow: {
            title: "Cuenta y seguridad",
            detail: "Gestiona dónde tienes la sesión iniciada y cómo inicias sesión",
        },
        developerRow: {
            title: "Portal de desarrolladores",
            detail: "Registra apps OAuth que inician sesión de usuarios con Tinyburg",
        },
    },
    notFound: {
        heading: "Piso no encontrado",
        body: "¿Quizá los bitizens movieron este piso? ¡Prueba en el vestíbulo!",
        goHome: "Ir al inicio",
        goBack: "Volver",
    },
};

import { Effect, Match, Option, Schema as S } from "effect";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Command, Dom, Navigation, type Runtime, Url } from "foldkit";
import { createLazy } from "foldkit/html";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { postLoginDestination } from "../shared/returnTo.ts";
import {
    type Api,
    DeveloperApps,
    FetchDeveloperApps,
    FetchMe,
    GotDeveloperApps,
    GotSession,
    SessionState,
    SessionUnknown,
} from "./backend.ts";
import { aboutView } from "./pages/about.ts";
import {
    ConsentMessage,
    ConsentModel,
    ConsentPromptData,
    consentFor,
    consentView,
    FetchConsentPrompt,
    updateConsent,
} from "./pages/consent.ts";
import { developerAppsView } from "./pages/developerApps.ts";
import { developersView } from "./pages/developers.ts";
import { homeView } from "./pages/home.ts";
import { loginView } from "./pages/login.ts";
import { notFoundView } from "./pages/notFound.ts";
import { privacyView } from "./pages/privacy.ts";
import { sponsorsView } from "./pages/sponsors.ts";
import { termsView } from "./pages/terms.ts";
import { initialWizard, towerLinkView, updateWizard, WizardMessage, WizardModel } from "./pages/towerLink.ts";
import { towerMeView } from "./pages/towerMe.ts";
import { AppRoute, consentRouter, loginHref, urlToAppRoute } from "./routes.ts";
import { clouds } from "./ui/chrome.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    developerApps: DeveloperApps.schema,
    wizard: WizardModel,
    consent: ConsentModel,
});
export type Model = typeof Model.Type;

// MESSAGE

export const ClickedLink = m("ClickedLink", { request: Navigation.UrlRequest });
export const ChangedUrl = m("ChangedUrl", { url: Url.Url });
export const CompletedNavigation = m("CompletedNavigation");

export const Message = S.Union([
    ClickedLink,
    ChangedUrl,
    CompletedNavigation,
    GotSession,
    GotDeveloperApps,
    WizardMessage,
    ConsentMessage,
]);
export type Message = typeof Message.Type;

type Step = readonly [Model, ReadonlyArray<Command.Command<Message, never, Api>>];

// COMMAND

const Navigate = Command.define("Navigate", {
    args: { url: S.String, replace: S.Boolean },
    messages: [CompletedNavigation],
    execute: ({ replace, url }) =>
        Effect.gen(function* () {
            yield* replace ? Navigation.replaceUrl(url) : Navigation.pushUrl(url);
            // Land like a fresh page load would: at the hash target when there
            // is one, otherwise at the top.
            const hash = new URL(url, window.location.origin).hash;
            yield* hash === ""
                ? Effect.sync(() => window.scrollTo(0, 0))
                : Dom.scrollIntoView(hash).pipe(Effect.catch(() => Effect.void));
            return CompletedNavigation();
        }),
});

const LoadExternal = Command.define("LoadExternal", {
    args: { href: S.String },
    messages: [CompletedNavigation],
    execute: ({ href }) => Navigation.load(href).pipe(Effect.as(CompletedNavigation())),
});

// Paths that belong to the server, not the SPA router: they must trigger a
// full page load so cookies and redirects work.
const isServerPath = (pathname: string): boolean =>
    pathname === "/logout" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/.well-known/");

const requiresSession = (route: AppRoute): boolean =>
    route._tag === "TowerMe" ||
    route._tag === "TowerLink" ||
    route._tag === "DeveloperApps" ||
    route._tag === "Consent";

/** Page-scoped state resets when its route is entered, like a fresh server
 *  render did. Used by init and every url change. */
const resetPageState = (model: Model, route: AppRoute): Model =>
    evo(model, {
        route: () => route,
        wizard: (wizard) => (route._tag === "TowerLink" ? initialWizard : wizard),
        developerApps: (apps) => (route._tag === "DeveloperApps" ? DeveloperApps.Idle() : apps),
        consent: (consent) => (route._tag === "Consent" ? consentFor(route.request) : consent),
    });

// UPDATE

/**
 * Entering a route mirrors what the old server rendering did per request:
 * signed-out visitors get redirected away from account pages, a signed-in
 * visitor on the login page is sent to their destination, and the developer
 * apps page loads its data.
 */
const enterRoute = (model: Model): Step => {
    const { route, session } = model;
    switch (route._tag) {
        case "Login": {
            if (session._tag === "SignedIn") {
                return [
                    model,
                    [Navigate({ url: postLoginDestination(Option.getOrNull(route.returnTo)), replace: true })],
                ];
            }
            return [model, []];
        }
        case "TowerMe":
        case "TowerLink": {
            if (session._tag === "SignedOut") return [model, [Navigate({ url: "/login", replace: true })]];
            return [model, []];
        }
        case "DeveloperApps": {
            if (session._tag === "SignedOut") {
                return [model, [Navigate({ url: loginHref(Option.some("/developers/apps")), replace: true })]];
            }
            if (session._tag === "SignedIn" && model.developerApps._tag === "Idle") {
                return [evo(model, { developerApps: () => DeveloperApps.Loading() }), [FetchDeveloperApps()]];
            }
            return [model, []];
        }
        case "Consent": {
            if (session._tag === "SignedOut") {
                return [
                    model,
                    [
                        Navigate({
                            url: loginHref(Option.some(consentRouter({ request: route.request }))),
                            replace: true,
                        }),
                    ],
                ];
            }
            if (session._tag === "SignedIn" && model.consent.prompt._tag === "Idle") {
                return Option.match(model.consent.requestId, {
                    onNone: () => [
                        evo(model, {
                            consent: (consent) =>
                                evo(consent, {
                                    prompt: () =>
                                        ConsentPromptData.Failure({
                                            error: "This authorization link is missing its request. Head back to the app you came from and try again.",
                                        }),
                                }),
                        }),
                        [],
                    ],
                    onSome: (requestId) => [
                        evo(model, {
                            consent: (consent) => evo(consent, { prompt: () => ConsentPromptData.Loading() }),
                        }),
                        [FetchConsentPrompt({ requestId })],
                    ],
                });
            }
            return [model, []];
        }
        default: {
            return [model, []];
        }
    }
};

const isWizardMessage = S.is(WizardMessage);
const isConsentMessage = S.is(ConsentMessage);

export const update = (model: Model, message: Message): Step => {
    if (isWizardMessage(message)) {
        const [wizard, wizardCommands] = updateWizard(model.wizard, message);
        const commands: Array<Command.Command<Message, never, Api>> = [...wizardCommands];
        // The old page did window.location.assign("/towers/@me") after linking
        if (message._tag === "SucceededVerify") commands.push(Navigate({ url: "/towers/@me", replace: false }));
        return [evo(model, { wizard: () => wizard }), commands];
    }

    if (isConsentMessage(message)) {
        const [consent, consentCommands] = updateConsent(model.consent, message);
        const commands: Array<Command.Command<Message, never, Api>> = [...consentCommands];
        // Decisions leave the SPA entirely, back to the client's redirect uri
        if (message._tag === "GotConsentRedirect") commands.push(LoadExternal({ href: message.redirectTo }));
        return [evo(model, { consent: () => consent }), commands];
    }

    return Match.value(message).pipe(
        Match.withReturnType<Step>(),
        Match.tagsExhaustive({
            ClickedLink: ({ request }) =>
                Match.value(request).pipe(
                    Match.withReturnType<Step>(),
                    Match.tagsExhaustive({
                        Internal: ({ url }) =>
                            isServerPath(url.pathname)
                                ? [model, [LoadExternal({ href: Url.toString(url) })]]
                                : [model, [Navigate({ url: Url.toString(url), replace: false })]],
                        External: ({ href }) => [model, [LoadExternal({ href })]],
                    })
                ),
            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url);
                const [next, commands] = enterRoute(resetPageState(model, route));
                // Re-check the session when entering an account page, like each
                // server render did; a signed-out answer re-runs the gating.
                const refresh = requiresSession(route) && next.session._tag === "SignedIn" ? [FetchMe()] : [];
                return [next, [...commands, ...refresh]];
            },
            GotSession: ({ session }) => enterRoute(evo(model, { session: () => session })),
            GotDeveloperApps: ({ apps }) => [evo(model, { developerApps: () => apps }), []],
            CompletedNavigation: () => [model, []],
        })
    );
};

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, void, Api> = (url) => {
    const route = urlToAppRoute(url);
    const [model, commands] = enterRoute(
        resetPageState(
            {
                route,
                session: SessionUnknown(),
                developerApps: DeveloperApps.Idle(),
                wizard: initialWizard,
                consent: consentFor(Option.none()),
            },
            route
        )
    );
    return [model, [FetchMe(), ...commands]];
};

// VIEW

const routeTitle = (route: AppRoute): string =>
    Match.value(route).pipe(
        Match.withReturnType<string>(),
        Match.tagsExhaustive({
            Home: () => "TinyTower Trading | Trade Bitizens, Costumes & More",
            About: () => "About | Tinyburg",
            Login: () => "Log In | Tinyburg",
            Privacy: () => "Privacy Policy | Tinyburg",
            Terms: () => "Terms of Service | Tinyburg",
            Sponsors: () => "Sponsors | Tinyburg",
            Developers: () => "Developers | Tinyburg",
            DeveloperApps: () => "OAuth Applications | Tinyburg",
            TowerMe: () => "My Towers | Tinyburg",
            TowerLink: () => "Link Your Tower | Tinyburg",
            Consent: () => "Authorize | Tinyburg",
            NotFound: () => "Page Not Found | Tinyburg",
        })
    );

const lazyHome = createLazy();
const lazyAbout = createLazy();
const lazyPrivacy = createLazy();
const lazyTerms = createLazy();
const lazySponsors = createLazy();
const lazyDevelopers = createLazy();
const lazyNotFound = createLazy();

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
    Match.value(model.route).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Home: () => lazyHome(homeView, [h]),
            About: () => lazyAbout(aboutView, [h]),
            Login: ({ returnTo }) => loginView(h, returnTo),
            Privacy: () => lazyPrivacy(privacyView, [h]),
            Terms: () => lazyTerms(termsView, [h]),
            Sponsors: () => lazySponsors(sponsorsView, [h]),
            Developers: () => lazyDevelopers(developersView, [h]),
            DeveloperApps: () => developerAppsView(h, model.developerApps),
            // Account pages wait for the session before rendering; a signed-out
            // visitor is redirected by enterRoute in the meantime.
            TowerMe: () => (model.session._tag === "SignedIn" ? towerMeView(h, model.session.user) : h.empty),
            TowerLink: () => (model.session._tag === "SignedIn" ? towerLinkView(h, model.wizard) : h.empty),
            Consent: () => (model.session._tag === "SignedOut" ? h.empty : consentView(h, model.consent)),
            NotFound: () => lazyNotFound(notFoundView, [h]),
        })
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: routeTitle(model.route),
    body: h.div([], [clouds(h), pageView(model, h)]),
});

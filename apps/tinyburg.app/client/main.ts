import { Effect, Match, Option, Schema as S } from "effect";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Command, Dom, Navigation, type Runtime, Url } from "foldkit";
import { m } from "foldkit/message";

import { postLoginDestination } from "../shared/returnTo.ts";
import {
    AppsIdle,
    AppsLoading,
    AppsState,
    FetchDeveloperApps,
    FetchMe,
    GotDeveloperApps,
    GotSession,
    SessionState,
    SessionUnknown,
} from "./backend.ts";
import { aboutView } from "./pages/about.ts";
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
import { AppRoute, loginHref, urlToAppRoute } from "./routes.ts";
import { clouds } from "./ui/chrome.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    developerApps: AppsState,
    wizard: WizardModel,
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
]);
export type Message = typeof Message.Type;

type Step = readonly [Model, ReadonlyArray<Command.Command<Message>>];

// COMMAND

const NavigateInternal = Command.define("NavigateInternal", {
    args: { url: S.String },
    messages: [CompletedNavigation],
    execute: ({ url }) => Navigation.pushUrl(url).pipe(Effect.as(CompletedNavigation())),
});

const ReplaceUrl = Command.define("ReplaceUrl", {
    args: { url: S.String },
    messages: [CompletedNavigation],
    execute: ({ url }) => Navigation.replaceUrl(url).pipe(Effect.as(CompletedNavigation())),
});

const LoadExternal = Command.define("LoadExternal", {
    args: { href: S.String },
    messages: [CompletedNavigation],
    execute: ({ href }) => Navigation.load(href).pipe(Effect.as(CompletedNavigation())),
});

const ScrollTo = Command.define("ScrollTo", {
    args: { selector: S.String },
    messages: [CompletedNavigation],
    execute: ({ selector }) =>
        Dom.scrollIntoView(selector).pipe(
            Effect.as(CompletedNavigation()),
            Effect.catch(() => Effect.succeed(CompletedNavigation()))
        ),
});

// Paths that belong to the server, not the SPA router: they must trigger a
// full page load so cookies and redirects work.
const isServerPath = (pathname: string): boolean =>
    pathname === "/logout" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/.well-known/");

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
                return [model, [ReplaceUrl({ url: postLoginDestination(Option.getOrNull(route.returnTo)) })]];
            }
            return [model, []];
        }
        case "TowerMe":
        case "TowerLink": {
            if (session._tag === "SignedOut") return [model, [ReplaceUrl({ url: "/login" })]];
            return [model, []];
        }
        case "DeveloperApps": {
            if (session._tag === "SignedOut") {
                return [model, [ReplaceUrl({ url: loginHref(Option.some("/developers/apps")) })]];
            }
            if (session._tag === "SignedIn" && model.developerApps._tag === "AppsIdle") {
                return [{ ...model, developerApps: AppsLoading() }, [FetchDeveloperApps()]];
            }
            return [model, []];
        }
        default: {
            return [model, []];
        }
    }
};

const isWizardMessage = S.is(WizardMessage);

export const update = (model: Model, message: Message): Step => {
    if (isWizardMessage(message)) {
        const [wizard, wizardCommands] = updateWizard(model.wizard, message);
        const commands: Array<Command.Command<Message>> = [...wizardCommands];
        // The old page did window.location.assign("/towers/@me") after linking
        if (message._tag === "SucceededVerify") commands.push(NavigateInternal({ url: "/towers/@me" }));
        return [{ ...model, wizard }, commands];
    }

    return Match.value(message).pipe(
        Match.withReturnType<Step>(),
        Match.tagsExhaustive({
            ClickedLink: ({ request }) =>
                Match.value(request).pipe(
                    Match.withReturnType<Step>(),
                    Match.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isServerPath(url.pathname)) return [model, [LoadExternal({ href: Url.toString(url) })]];
                            const commands: Array<Command.Command<Message>> = [
                                NavigateInternal({ url: Url.toString(url) }),
                            ];
                            if (Option.isSome(url.hash)) commands.push(ScrollTo({ selector: url.hash.value }));
                            return [model, commands];
                        },
                        External: ({ href }) => [model, [LoadExternal({ href })]],
                    })
                ),
            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url);
                return enterRoute({
                    ...model,
                    route,
                    // Page-scoped state resets on entry, like a fresh server render did
                    wizard: route._tag === "TowerLink" ? initialWizard : model.wizard,
                    developerApps: route._tag === "DeveloperApps" ? AppsIdle() : model.developerApps,
                });
            },
            GotSession: ({ session }) => enterRoute({ ...model, session }),
            GotDeveloperApps: ({ apps }) => [{ ...model, developerApps: apps }, []],
            CompletedNavigation: () => [model, []],
        })
    );
};

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (url) => {
    const [model, commands] = enterRoute({
        route: urlToAppRoute(url),
        session: SessionUnknown(),
        developerApps: AppsIdle(),
        wizard: initialWizard,
    });
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
            NotFound: () => "Page Not Found | Tinyburg",
        })
    );

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
    Match.value(model.route).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Home: () => homeView(h),
            About: () => aboutView(h),
            Login: ({ returnTo }) => loginView(h, returnTo),
            Privacy: () => privacyView(h),
            Terms: () => termsView(h),
            Sponsors: () => sponsorsView(h),
            Developers: () => developersView(h),
            DeveloperApps: () => developerAppsView(h, model.developerApps),
            // Account pages wait for the session before rendering; a signed-out
            // visitor is redirected by enterRoute in the meantime.
            TowerMe: () => (model.session._tag === "SignedIn" ? towerMeView(h, model.session.user) : h.empty),
            TowerLink: () => (model.session._tag === "SignedIn" ? towerLinkView(h, model.wizard) : h.empty),
            NotFound: () => notFoundView(h),
        })
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: routeTitle(model.route),
    body: h.div([], [clouds(h), pageView(model, h)]),
});

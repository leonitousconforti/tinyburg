import { Effect, Match, Option, Schema as S } from "effect";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Command, Dom, Navigation, type Runtime, Url } from "foldkit";
import { createLazy } from "foldkit/html";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import {
    type Api,
    type Token,
    BeginSignIn,
    CompletedSignIn,
    CompleteSignIn,
    FetchLinkedTowers,
    GotLinkedTowers,
    GotSession,
    GotSignInError,
    LinkedTowers,
    SessionState,
    SignedIn,
    SignedOut,
    SigningIn,
} from "./backend.ts";
import { aboutView } from "./pages/about.ts";
import { callbackView } from "./pages/callback.ts";
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
import { AppRoute, urlToAppRoute } from "./routes.ts";
import { clouds } from "./ui/chrome.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    signInError: S.Option(S.String),
    linkedTowers: LinkedTowers.schema,
    wizard: WizardModel,
});
export type Model = typeof Model.Type;

// MESSAGE

export const ClickedLink = m("ClickedLink", { request: Navigation.UrlRequest });
export const ChangedUrl = m("ChangedUrl", { url: Url.Url });
export const ClickedSignIn = m("ClickedSignIn");
export const CompletedNavigation = m("CompletedNavigation");

export const Message = S.Union([
    ClickedLink,
    ChangedUrl,
    ClickedSignIn,
    CompletedNavigation,
    CompletedSignIn,
    GotSession,
    GotSignInError,
    GotLinkedTowers,
    WizardMessage,
]);
export type Message = typeof Message.Type;

type Step = readonly [Model, ReadonlyArray<Command.Command<Message, never, Api | Token>>];

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

// Paths the server owns: the OIDC provider, the federated login round trip,
// and sign out. Clicking one has to leave the SPA.
const isServerPath = (pathname: string): boolean =>
    pathname === "/logout" ||
    pathname === "/login" ||
    (pathname.startsWith("/auth/") && pathname !== "/auth/callback") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/.well-known/");

const requiresSession = (route: AppRoute): boolean =>
    route._tag === "TowerMe" || route._tag === "TowerLink" || route._tag === "DeveloperApps";

/** Page-scoped state resets when its route is entered. */
const resetPageState = (model: Model, route: AppRoute): Model =>
    evo(model, {
        route: () => route,
        wizard: (wizard) => (route._tag === "TowerLink" ? initialWizard : wizard),
        linkedTowers: (towers) => (route._tag === "TowerMe" ? LinkedTowers.Idle() : towers),
    });

// UPDATE

/**
 * Entering a route decides what the SPA owes the visitor. Gated pages need an
 * access token, and getting one means leaving for the provider: the redirect
 * is silent when the provider session is still good, and shows the sign in
 * page when it is not.
 */
const enterRoute = (model: Model): Step => {
    const { route, session } = model;

    if (route._tag === "Callback") {
        return [model, session._tag === "SignedIn" ? [] : [CompleteSignIn({ search: window.location.search })]];
    }

    if (requiresSession(route) && session._tag === "SignedOut") {
        return [
            evo(model, { session: () => SigningIn() }),
            [BeginSignIn({ returnTo: window.location.pathname + window.location.search })],
        ];
    }

    if (route._tag === "TowerMe" && session._tag === "SignedIn" && model.linkedTowers._tag === "Idle") {
        return [evo(model, { linkedTowers: () => LinkedTowers.Loading() }), [FetchLinkedTowers()]];
    }

    return [model, []];
};

const isWizardMessage = S.is(WizardMessage);

export const update = (model: Model, message: Message): Step => {
    if (isWizardMessage(message)) {
        const [wizard, wizardCommands] = updateWizard(model.wizard, message);
        const commands: Array<Command.Command<Message, never, Api | Token>> = [...wizardCommands];
        if (message._tag === "SucceededVerify") commands.push(Navigate({ url: "/towers/@me", replace: false }));
        return [evo(model, { wizard: () => wizard }), commands];
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
            ChangedUrl: ({ url }) => enterRoute(resetPageState(model, urlToAppRoute(url))),
            ClickedSignIn: () => [
                evo(model, { session: () => SigningIn(), signInError: Option.none }),
                [BeginSignIn({ returnTo: "/towers/@me" })],
            ],
            // The token is in hand; drop the code from the url before it can
            // be shared or replayed, then resume where sign in interrupted.
            CompletedSignIn: ({ credentials, returnTo }) => [
                evo(model, { session: () => SignedIn({ credentials }), signInError: Option.none }),
                [Navigate({ url: returnTo, replace: true })],
            ],
            GotSession: ({ session }) => enterRoute(evo(model, { session: () => session })),
            GotSignInError: ({ message: error }) => [
                evo(model, {
                    session: () => SignedOut(),
                    signInError: () => (error === "" ? Option.none<string>() : Option.some(error)),
                }),
                [],
            ],
            GotLinkedTowers: ({ towers }) => [evo(model, { linkedTowers: () => towers }), []],
            CompletedNavigation: () => [model, []],
        })
    );
};

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, void, Api | Token> = (url) => {
    const route = urlToAppRoute(url);
    return enterRoute({
        route,
        session: SignedOut(),
        signInError: Option.none(),
        linkedTowers: LinkedTowers.Idle(),
        wizard: initialWizard,
    });
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
            Callback: () => "Signing In | Tinyburg",
            NotFound: () => "Page Not Found | Tinyburg",
        })
    );

const lazyHome = createLazy();
const lazyAbout = createLazy();
const lazyPrivacy = createLazy();
const lazyTerms = createLazy();
const lazySponsors = createLazy();
const lazyDevelopers = createLazy();
const lazyDeveloperApps = createLazy();
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
            DeveloperApps: () => lazyDeveloperApps(developerAppsView, [h]),
            // Gated pages render nothing while the token round trip runs;
            // enterRoute has already sent the browser to the provider.
            TowerMe: () =>
                model.session._tag === "SignedIn"
                    ? towerMeView(h, model.session.credentials.account, model.linkedTowers)
                    : h.empty,
            TowerLink: () => (model.session._tag === "SignedIn" ? towerLinkView(h, model.wizard) : h.empty),
            Callback: () => callbackView(h, model.signInError),
            NotFound: () => lazyNotFound(notFoundView, [h]),
        })
    );

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: routeTitle(model.route),
    body: h.div([], [clouds(h), pageView(model, h)]),
});

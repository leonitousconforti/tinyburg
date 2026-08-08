import { Effect, Match, Option, Schema as S } from "effect";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { fromNavigator, Language } from "@tinyburg/ui/Internationalization";
import { AsyncData, Command, Dom, Navigation, Render, type Runtime, Url } from "foldkit";
import { createLazy } from "foldkit/html";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import {
    type Backend,
    CheckingSession,
    FetchLinkedTowers,
    FetchSession,
    GotSession,
    LinkedTowers,
    SessionState,
    SettledLinkedTowers,
    SignedOut,
} from "./backend.ts";
import { type Messages, messagesFor, type TitleMessages } from "./messages/index.ts";
import { aboutView } from "./pages/about.ts";
import {
    AccountMessage,
    AccountModel,
    FetchLinkedAccounts,
    FetchSessions,
    accountView,
    enterAccount,
    initialAccount,
    updateAccount,
} from "./pages/account.ts";
import { developerAppsView } from "./pages/developerApps.ts";
import { developersView } from "./pages/developers.ts";
import { homeView } from "./pages/home.ts";
import { loginView } from "./pages/login.ts";
import { notFoundView } from "./pages/notFound.ts";
import { privacyView } from "./pages/privacy.ts";
import { sponsorsView } from "./pages/sponsors.ts";
import { termsView } from "./pages/terms.ts";
import { WizardMessage, WizardModel, initialWizard, towerLinkView, updateWizard } from "./pages/towerLink.ts";
import { towerMeView } from "./pages/towerMe.ts";
import { AppRoute, loginHref, urlToAppRoute } from "./routes.ts";
import { clouds } from "./ui/chrome.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    linkedTowers: LinkedTowers.schema,
    wizard: WizardModel,
    account: AccountModel,
    language: Language,
});
export type Model = typeof Model.Type;

/**
 * Negotiated once from the browser's preferences at module load (precedent:
 * the module-scope `matchMedia` below). There is no switcher yet, so the
 * language is plain model data that never changes after init. Guarded for the
 * node test environment, which has no `navigator`.
 */
export const initialLanguage = fromNavigator(
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language])
);

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
    GotSession,
    SettledLinkedTowers,
    WizardMessage,
    AccountMessage,
]);
export type Message = typeof Message.Type;

type Step = readonly [Model, ReadonlyArray<Command.Command<Message, never, Backend>>];

// COMMAND

const Navigate = Command.define("Navigate", {
    args: { url: S.String, replace: S.Boolean },
    messages: [CompletedNavigation],
    execute: ({ replace, url }) =>
        Effect.gen(function* () {
            yield* replace ? Navigation.replaceUrl(url) : Navigation.pushUrl(url);
            // Land like a fresh page load would: at the hash target when there
            // is one, otherwise at the top. Waiting for the url change's own
            // patch puts the reset after the incoming page exists rather than
            // on the page still being looked at, which under a View Transition
            // means it happens behind the outgoing snapshot instead of jerking
            // the visitor to the top and only then swapping. The top reset must
            // be instant: the html-level `scroll-behavior: smooth` would
            // otherwise animate it through the transition.
            yield* Render.afterCommit;
            const hash = new URL(url, window.location.origin).hash;
            yield* hash === ""
                ? Effect.sync(() => window.scrollTo({ top: 0, behavior: "instant" }))
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
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/oauth/") ||
    pathname.startsWith("/.well-known/");

const requiresSession = (route: AppRoute): boolean =>
    route._tag === "TowerMe" ||
    route._tag === "TowerLink" ||
    route._tag === "DeveloperApps" ||
    route._tag === "Account";

/**
 * Page-scoped state resets when its route is entered. Fetched collections are
 * deliberately not reset: they stay in the model so a return visit renders
 * them immediately while enterRoute revalidates behind them.
 */
const resetPageState = (model: Model, route: AppRoute): Model =>
    evo(model, {
        route: () => route,
        wizard: (wizard) => (route._tag === "TowerLink" ? initialWizard : wizard),
        account: (account) => (route._tag === "Account" ? enterAccount(route.link, route.error, account) : account),
    });

// UPDATE

/**
 * Entering a route decides what the SPA owes the visitor. Gated pages need a
 * session, and the app cannot see its own cookie: it waits for the answer
 * already in flight, then either renders or hands the visitor to the server's
 * login page.
 */
const enterRoute = (model: Model): Step => {
    const { route, session } = model;

    if (requiresSession(route) && session._tag === "SignedOut") {
        const returnTo = window.location.pathname + window.location.search;
        return [model, [LoadExternal({ href: loginHref(Option.some(returnTo)) })]];
    }

    // Entering a data-backed page revalidates what it already holds and loads
    // what it doesn't; None means a request is already in flight and is left
    // alone. Stale-while-revalidate falls out: kept data renders immediately
    // as Refreshing while the fetch runs behind it.
    if (route._tag === "TowerMe" && session._tag === "SignedIn") {
        return Option.match(AsyncData.revalidateOrLoad(model.linkedTowers), {
            onNone: (): Step => [model, []],
            onSome: (linkedTowers): Step => [evo(model, { linkedTowers: () => linkedTowers }), [FetchLinkedTowers()]],
        });
    }

    if (route._tag === "Account" && session._tag === "SignedIn") {
        const sessions = AsyncData.revalidateOrLoad(model.account.sessions);
        const accounts = AsyncData.revalidateOrLoad(model.account.accounts);
        return [
            evo(model, {
                account: (account) =>
                    evo(account, {
                        sessions: (current) => Option.getOrElse(sessions, () => current),
                        accounts: (current) => Option.getOrElse(accounts, () => current),
                    }),
            }),
            [
                ...(Option.isSome(sessions) ? [FetchSessions()] : []),
                ...(Option.isSome(accounts) ? [FetchLinkedAccounts()] : []),
            ],
        ];
    }

    return [model, []];
};

const isWizardMessage = S.is(WizardMessage);
const isAccountMessage = S.is(AccountMessage);

export const update = (model: Model, message: Message): Step => {
    if (isWizardMessage(message)) {
        const [wizard, wizardCommands] = updateWizard(model.wizard, message);
        const commands: Array<Command.Command<Message, never, Backend>> = [...wizardCommands];
        if (message._tag === "SucceededVerify") commands.push(Navigate({ url: "/towers/@me", replace: false }));
        return [evo(model, { wizard: () => wizard }), commands];
    }

    if (isAccountMessage(message)) {
        const [account, accountCommands] = updateAccount(model.account, message);
        const commands: Array<Command.Command<Message, never, Backend>> = [...accountCommands];

        // Ending the session this browser holds, or discovering it was ended
        // elsewhere, leaves nothing here to render. The server owns the way
        // back, so the app leaves rather than redrawing an account it no
        // longer has.
        const signedOut =
            message._tag === "SignedOutElsewhere" || (message._tag === "CompletedRevoke" && message.signedOut);
        if (signedOut) {
            return [evo(model, { account: () => account, session: () => SignedOut() }), [LoadExternal({ href: "/" })]];
        }

        return [evo(model, { account: () => account }), commands];
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
            ClickedSignIn: () => [model, [LoadExternal({ href: loginHref(Option.some("/towers/@me")) })]],
            GotSession: ({ session }) => enterRoute(evo(model, { session: () => session })),
            // Folds the fetch outcome into whatever state is current: success
            // replaces it, and failure keeps any held data as Stale rather
            // than blanking the page.
            SettledLinkedTowers: ({ result }) => [evo(model, { linkedTowers: AsyncData.settle(result) }), []],
            CompletedNavigation: () => [model, []],
        })
    );
};

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, void, Backend> = (url) => {
    const route = urlToAppRoute(url);

    // The session answer decides every gated route, so it is the first thing
    // asked for; until it lands the app is neither signed in nor out. Landing
    // runs through the same page-state reset as navigating, so anything the
    // url carries (like a link outcome) is seen on a fresh load too.
    const [model, commands] = enterRoute(
        resetPageState(
            {
                route,
                session: CheckingSession(),
                linkedTowers: LinkedTowers.Idle(),
                wizard: initialWizard,
                account: initialAccount,
                language: initialLanguage,
            },
            route
        )
    );
    return [model, [FetchSession(), ...commands]];
};

// VIEW

const routeTitle = (route: AppRoute, titles: TitleMessages): string =>
    Match.value(route).pipe(
        Match.withReturnType<string>(),
        Match.tagsExhaustive({
            Home: () => titles.home,
            About: () => titles.about,
            Login: () => titles.login,
            Privacy: () => titles.privacy,
            Terms: () => titles.terms,
            Sponsors: () => titles.sponsors,
            Developers: () => titles.developers,
            DeveloperApps: () => titles.developerApps,
            TowerMe: () => titles.towerMe,
            TowerLink: () => titles.towerLink,
            Account: () => titles.account,
            NotFound: () => titles.notFound,
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

// The msgs slices ride in every lazy arg array (`messagesFor` is
// reference-stable per language, so memoization still holds); leaving one out
// would silently pin stale copy if a language switcher ever lands.
const pageView = (model: Model, msgs: Messages, h: HtmlBuilder<Message>): Html =>
    Match.value(model.route).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Home: () => lazyHome(homeView, [h, msgs.home, msgs.shared]),
            About: () => lazyAbout(aboutView, [h, msgs.about, msgs.shared]),
            Login: ({ error, returnTo }) => loginView(h, msgs.login, msgs.shared, returnTo, error),
            Privacy: () => lazyPrivacy(privacyView, [h]),
            Terms: () => lazyTerms(termsView, [h]),
            Sponsors: () => lazySponsors(sponsorsView, [h, msgs.sponsors, msgs.shared]),
            Developers: () => lazyDevelopers(developersView, [h, msgs.developers, msgs.shared]),
            DeveloperApps: () => lazyDeveloperApps(developerAppsView, [h, msgs.developerApps, msgs.shared]),
            // Gated pages render nothing until the session answer lands;
            // enterRoute has already sent a signed out visitor to login.
            TowerMe: () =>
                model.session._tag === "SignedIn"
                    ? towerMeView(h, msgs.towerMe, msgs.shared, model.language, model.session.user, model.linkedTowers)
                    : h.empty,
            TowerLink: () =>
                model.session._tag === "SignedIn" ? towerLinkView(h, msgs.towerLink, model.wizard) : h.empty,
            Account: () =>
                model.session._tag === "SignedIn"
                    ? accountView(h, msgs.account, model.language, model.account, model.session.user)
                    : h.empty,
            NotFound: () => lazyNotFound(notFoundView, [h, msgs.notFound, msgs.shared]),
        })
    );

/**
 * Keys the page wrapper so navigating replaces it outright rather than patching
 * one page's markup into another's shape. Gated pages render empty until the
 * session answer lands, so they stay keyed as pending and are replaced when
 * their real content first appears.
 */
const pageKey = (model: Model): string =>
    requiresSession(model.route) && model.session._tag !== "SignedIn"
        ? `${model.route._tag}#pending`
        : model.route._tag;

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
    const msgs = messagesFor(model.language);
    return {
        title: routeTitle(model.route, msgs.titles),
        body: h.div([], [clouds(h), h.keyed("div")(pageKey(model), [], [pageView(model, msgs, h)])]),
    };
};

// VIEW TRANSITION

/**
 * How deep a route sits under the front page. Every page below the front page
 * carries a back link, and this is the ladder those links walk back up: going
 * somewhere deeper is a different move than coming back out, and the animation
 * says which happened. The depths are stated rather than counted from the path
 * because the url does not carry the hierarchy: /account is reached from
 * /towers/@me despite sitting on one fewer path segment.
 */
const routeDepth = (route: AppRoute): number =>
    Match.value(route).pipe(
        Match.withReturnType<number>(),
        Match.tagsExhaustive({
            Home: () => 0,
            About: () => 1,
            Login: () => 1,
            Privacy: () => 1,
            Terms: () => 1,
            Sponsors: () => 1,
            Developers: () => 1,
            TowerMe: () => 1,
            NotFound: () => 1,
            DeveloperApps: () => 2,
            TowerLink: () => 2,
            Account: () => 2,
        })
    );

// Read live rather than sampled once: the visitor can turn the preference on
// mid-session and the next navigation has to honor it.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Decides which renders animate. Only the ones that replace the whole page do:
 * navigating between routes, and a gated page's content arriving to replace the
 * blank it shows while the session answer is in flight. Everything else (linked
 * towers landing, a wizard step, an account panel opening) is a detail inside a
 * page the visitor is already reading, and cross-fading the document underneath
 * it would read as lag rather than polish.
 *
 * Reduced motion opts out here rather than in CSS so no transition starts at
 * all, which also spares the document the brief freeze one imposes.
 */
export const viewTransition: Runtime.ViewTransitionConfig<Model, Message> = ({ message, model, previousModel }) => {
    if (prefersReducedMotion.matches) return false;

    if (message._tag === "ChangedUrl") {
        const descent = routeDepth(model.route) - routeDepth(previousModel.route);
        return { types: [descent > 0 ? "forward" : descent < 0 ? "backward" : "sibling"] };
    }

    // The session answer is what turns a gated page from blank into its
    // content. To the visitor that first paint is the page arriving, so it
    // fades in like one instead of appearing between frames.
    const revealed =
        requiresSession(model.route) && previousModel.session._tag !== "SignedIn" && model.session._tag === "SignedIn";
    return revealed ? { types: ["reveal"] } : false;
};

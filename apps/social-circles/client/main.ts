import { Effect, Match, Option, Schema as S } from "effect";

import type { TitleMessages } from "./messages/types.ts";
import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Language } from "@tinyburg/ui/Internationalization";
import { AsyncData, Command, Navigation, Render, type Runtime, Url } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { type Backend, CheckingSession, FetchSession, GotSession, SessionState, SignedOut } from "./backend.ts";
import { initialLanguage, messagesFor } from "./messages/index.ts";
import { homeView } from "./pages/home.ts";
import { loginView } from "./pages/login.ts";
import { notFoundView } from "./pages/notFound.ts";
import { privacyView } from "./pages/privacy.ts";
import {
    FetchTowers,
    TowersMessage,
    TowersModel,
    enterTowers,
    initialTowers,
    towersView,
    updateTowers,
} from "./pages/towers.ts";
import { AppRoute, loginHref, urlToAppRoute } from "./routes.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    towers: TowersModel,

    // Decided once at init from the browser's preferences; nothing changes it.
    language: Language,
});
export type Model = typeof Model.Type;

// MESSAGE

export const ClickedLink = m("ClickedLink", { request: Navigation.UrlRequest });
export const ChangedUrl = m("ChangedUrl", { url: Url.Url });
export const CompletedNavigation = m("CompletedNavigation");

export const Message = S.Union([ClickedLink, ChangedUrl, CompletedNavigation, GotSession, TowersMessage]);
export type Message = typeof Message.Type;

type Step = readonly [Model, ReadonlyArray<Command.Command<Message, never, Backend>>];

// COMMAND

const Navigate = Command.define("Navigate", {
    args: { url: S.String, replace: S.Boolean },
    messages: [CompletedNavigation],
    execute: ({ replace, url }) =>
        Effect.gen(function* () {
            yield* replace ? Navigation.replaceUrl(url) : Navigation.pushUrl(url);
            yield* Render.afterCommit;
            yield* Effect.sync(() => window.scrollTo({ top: 0, behavior: "instant" }));
            return CompletedNavigation();
        }),
});

const LoadExternal = Command.define("LoadExternal", {
    args: { href: S.String },
    messages: [CompletedNavigation],
    execute: ({ href }) => Navigation.load(href).pipe(Effect.as(CompletedNavigation())),
});

// Paths the server owns: the sign-in round trip and sign out. Clicking one has
// to leave the SPA.
const isServerPath = (pathname: string): boolean => pathname === "/logout" || pathname.startsWith("/auth/");

const requiresSession = (route: AppRoute): boolean => route._tag === "Towers";

/** Page-scoped state resets when its route is entered. */
const resetPageState = (model: Model, route: AppRoute): Model =>
    evo(model, {
        route: () => route,
        towers: (towers) => (route._tag === "Towers" ? enterTowers(towers) : towers),
    });

// UPDATE

/**
 * Entering a route decides what the SPA owes the visitor. The towers page needs
 * a session, and the app cannot see its own cookie: it waits for the answer
 * already in flight, then either renders or hands the visitor to login.
 */
const enterRoute = (model: Model): Step => {
    const { route, session } = model;

    if (requiresSession(route) && session._tag === "SignedOut") {
        const returnTo = window.location.pathname + window.location.search;
        return [model, [Navigate({ url: loginHref(Option.some(returnTo)), replace: true })]];
    }

    if (route._tag === "Towers" && session._tag === "SignedIn") {
        return Option.match(AsyncData.revalidateOrLoad(model.towers.towers), {
            onNone: (): Step => [model, []],
            onSome: (towers): Step => [
                evo(model, { towers: (towersModel) => evo(towersModel, { towers: () => towers }) }),
                [FetchTowers()],
            ],
        });
    }

    return [model, []];
};

const isTowersMessage = S.is(TowersMessage);

export const update = (model: Model, message: Message): Step => {
    if (isTowersMessage(message)) {
        const [towers, towersCommands] = updateTowers(model.towers, message);
        const commands: Array<Command.Command<Message, never, Backend>> = [...towersCommands];

        // The session ended elsewhere; the server owns the way back.
        if (message._tag === "SignedOutElsewhere") {
            return [
                evo(model, { towers: () => towers, session: () => SignedOut() }),
                [Navigate({ url: loginHref(Option.some("/towers")), replace: true })],
            ];
        }

        return [evo(model, { towers: () => towers }), commands];
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
            GotSession: ({ session }) => enterRoute(evo(model, { session: () => session })),
            CompletedNavigation: () => [model, []],
        })
    );
};

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, void, Backend> = (url) => {
    const route = urlToAppRoute(url);

    // The session answer decides the gated route, so it is the first thing
    // asked for; until it lands the app is neither signed in nor out.
    const [model, commands] = enterRoute(
        resetPageState(
            {
                route,
                session: CheckingSession(),
                towers: initialTowers,
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
            Login: () => titles.login,
            Towers: () => titles.towers,
            Privacy: () => titles.privacy,
            NotFound: () => titles.notFound,
        })
    );

const pageView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const msgs = messagesFor(model.language);
    return Match.value(model.route).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Home: () => homeView(h, msgs.home, model.session),
            Login: ({ error, returnTo }) => loginView(h, msgs.login, returnTo, error),
            // The gated page renders nothing until the session answer lands;
            // enterRoute has already sent a signed out visitor to login.
            Towers: () =>
                model.session._tag === "SignedIn"
                    ? towersView(h, msgs.towers, model.language, model.towers, model.session.session)
                    : h.empty,
            Privacy: () => privacyView(h),
            NotFound: () => notFoundView(h, msgs.notFound),
        })
    );
};

/**
 * Keys the page wrapper so navigating replaces it outright rather than patching
 * one page's markup into another's shape.
 */
const pageKey = (model: Model): string =>
    requiresSession(model.route) && model.session._tag !== "SignedIn"
        ? `${model.route._tag}#pending`
        : model.route._tag;

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: routeTitle(model.route, messagesFor(model.language).titles),
    body: h.div([], [h.keyed("div")(pageKey(model), [], [pageView(model, h)])]),
});

import { Effect, Match, Option, Schema as S } from "effect";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { AsyncData, Command, Navigation, Render, type Runtime, Url } from "foldkit";
import { m } from "foldkit/message";
import { evo } from "foldkit/struct";

import { type Backend, CheckingSession, FetchSession, GotSession, SessionState, SignedOut } from "./backend.ts";
import {
    AdminMessage,
    AdminModel,
    adminView,
    enterAdmin,
    FetchAdminKeys,
    initialAdmin,
    updateAdmin,
} from "./pages/admin.ts";
import { homeView } from "./pages/home.ts";
import { enterKeys, FetchKeys, initialKeys, KeysMessage, KeysModel, keysView, updateKeys } from "./pages/keys.ts";
import { loginView } from "./pages/login.ts";
import { notFoundView } from "./pages/notFound.ts";
import { AppRoute, loginHref, urlToAppRoute } from "./routes.ts";

// MODEL

export const Model = S.Struct({
    route: AppRoute,
    session: SessionState,
    keys: KeysModel,
    admin: AdminModel,
});
export type Model = typeof Model.Type;

// MESSAGE

export const ClickedLink = m("ClickedLink", { request: Navigation.UrlRequest });
export const ChangedUrl = m("ChangedUrl", { url: Url.Url });
export const CompletedNavigation = m("CompletedNavigation");

export const Message = S.Union([ClickedLink, ChangedUrl, CompletedNavigation, GotSession, KeysMessage, AdminMessage]);
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

// Paths the server owns: the sign-in round trip and sign out. Clicking one
// has to leave the SPA.
const isServerPath = (pathname: string): boolean => pathname === "/logout" || pathname.startsWith("/auth/");

const requiresSession = (route: AppRoute): boolean => route._tag === "Keys" || route._tag === "Admin";

/** Page-scoped state resets when its route is entered. */
const resetPageState = (model: Model, route: AppRoute): Model =>
    evo(model, {
        route: () => route,
        keys: (keys) => (route._tag === "Keys" ? enterKeys(keys) : keys),
        admin: (admin) => (route._tag === "Admin" ? enterAdmin(route.error, admin) : admin),
    });

// UPDATE

/**
 * Entering a route decides what the SPA owes the visitor. The keys page needs
 * a session, and the app cannot see its own cookie: it waits for the answer
 * already in flight, then either renders or hands the visitor to the login
 * page.
 */
const enterRoute = (model: Model): Step => {
    const { route, session } = model;

    if (requiresSession(route) && session._tag === "SignedOut") {
        const returnTo = window.location.pathname + window.location.search;
        return [model, [Navigate({ url: loginHref(Option.some(returnTo)), replace: true })]];
    }

    if (route._tag === "Keys" && session._tag === "SignedIn") {
        return Option.match(AsyncData.revalidateOrLoad(model.keys.keys), {
            onNone: (): Step => [model, []],
            onSome: (keys): Step => [
                evo(model, { keys: (keysModel) => evo(keysModel, { keys: () => keys }) }),
                [FetchKeys()],
            ],
        });
    }

    // The admin fetch is also the elevation probe: Forbidden folds into the
    // page as "show the step-up form".
    if (route._tag === "Admin" && session._tag === "SignedIn") {
        return Option.match(AsyncData.revalidateOrLoad(model.admin.keys), {
            onNone: (): Step => [model, []],
            onSome: (keys): Step => [
                evo(model, { admin: (adminModel) => evo(adminModel, { keys: () => keys }) }),
                [FetchAdminKeys()],
            ],
        });
    }

    return [model, []];
};

const isKeysMessage = S.is(KeysMessage);
const isAdminMessage = S.is(AdminMessage);

export const update = (model: Model, message: Message): Step => {
    if (isAdminMessage(message)) {
        const [admin, adminCommands] = updateAdmin(model.admin, message);
        const commands: Array<Command.Command<Message, never, Backend>> = [...adminCommands];

        // The session ended elsewhere; the server owns the way back.
        if (message._tag === "AdminSignedOutElsewhere") {
            return [
                evo(model, { admin: () => admin, session: () => SignedOut() }),
                [Navigate({ url: loginHref(Option.some("/admin")), replace: true })],
            ];
        }

        return [evo(model, { admin: () => admin }), commands];
    }

    if (isKeysMessage(message)) {
        const [keys, keysCommands] = updateKeys(model.keys, message);
        const commands: Array<Command.Command<Message, never, Backend>> = [...keysCommands];

        // The session ended elsewhere; the server owns the way back.
        if (message._tag === "SignedOutElsewhere") {
            return [
                evo(model, { keys: () => keys, session: () => SignedOut() }),
                [Navigate({ url: loginHref(Option.some("/keys")), replace: true })],
            ];
        }

        return [evo(model, { keys: () => keys }), commands];
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
                keys: initialKeys,
                admin: initialAdmin,
            },
            route
        )
    );
    return [model, [FetchSession(), ...commands]];
};

// VIEW

const routeTitle = (route: AppRoute): string =>
    Match.value(route).pipe(
        Match.withReturnType<string>(),
        Match.tagsExhaustive({
            Home: () => "Tinyburg Authproxy | API Keys for Nimblebit's Servers",
            Login: () => "Sign In | Tinyburg Authproxy",
            Keys: () => "Your API Keys | Tinyburg Authproxy",
            Admin: () => "Admin | Tinyburg Authproxy",
            NotFound: () => "Page Not Found | Tinyburg Authproxy",
        })
    );

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
    Match.value(model.route).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Home: () => homeView(h, model.session),
            Login: ({ error, returnTo }) => loginView(h, returnTo, error),
            // The gated page renders nothing until the session answer lands;
            // enterRoute has already sent a signed out visitor to login.
            Keys: () => (model.session._tag === "SignedIn" ? keysView(h, model.keys, model.session.session) : h.empty),
            Admin: () => (model.session._tag === "SignedIn" ? adminView(h, model.admin) : h.empty),
            NotFound: () => notFoundView(h),
        })
    );

/**
 * Keys the page wrapper so navigating replaces it outright rather than
 * patching one page's markup into another's shape.
 */
const pageKey = (model: Model): string =>
    requiresSession(model.route) && model.session._tag !== "SignedIn"
        ? `${model.route._tag}#pending`
        : model.route._tag;

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: routeTitle(model.route),
    body: h.div([], [h.keyed("div")(pageKey(model), [], [pageView(model, h)])]),
});

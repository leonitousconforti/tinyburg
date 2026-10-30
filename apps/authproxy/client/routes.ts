import { Option, Schema as S, pipe } from "effect";

import { Route } from "foldkit";
import { defineRouteUnion, literal } from "foldkit/route";

export const AppRoute = defineRouteUnion({
    Home: {},
    // The oauth callback reports a failed sign in through the `error` query
    // parameter; the page opens saying so rather than pretending nothing happened.
    Login: { returnTo: S.Option(S.String), error: S.Option(S.String) },
    Keys: {},
    // The elevation round trip reports a refusal through the `error` query
    // parameter; the page opens saying so rather than pretending nothing happened.
    Admin: { error: S.Option(S.String) },
    NotFound: { path: S.String },
});
export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home));
export const loginRouter = pipe(
    literal("login"),
    Route.query(S.Struct({ returnTo: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AppRoute.Login)
);
export const keysRouter = pipe(literal("keys"), Route.mapTo(AppRoute.Keys));
export const adminRouter = pipe(
    literal("admin"),
    Route.query(S.Struct({ error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AppRoute.Admin)
);

const routeParser = Route.oneOf(homeRouter, loginRouter, keysRouter, adminRouter);

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound);

/** /login, carrying the page to return to after signing in. */
export const loginHref = (returnTo: Option.Option<string>): string => loginRouter({ returnTo, error: Option.none() });

/** The server-owned start of the sign-in round trip. */
export const startLoginHref = (returnTo: Option.Option<string>): string =>
    Option.match(returnTo, {
        onNone: () => "/auth/login",
        onSome: (destination) => `/auth/login?returnTo=${encodeURIComponent(destination)}`,
    });

import { Option, pipe, Schema as S } from "effect";

import { Route } from "foldkit";
import { literal, r } from "foldkit/route";

export const HomeRoute = r("Home");
// The oauth callback reports a failed sign in through the `error` query
// parameter; the page opens saying so rather than pretending nothing happened.
export const LoginRoute = r("Login", { returnTo: S.Option(S.String), error: S.Option(S.String) });
export const TowersRoute = r("Towers");
export const PrivacyRoute = r("Privacy");
export const NotFoundRoute = r("NotFound", { path: S.String });

export const AppRoute = S.Union([HomeRoute, LoginRoute, TowersRoute, PrivacyRoute, NotFoundRoute]);
export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute));
export const loginRouter = pipe(
    literal("login"),
    Route.query(S.Struct({ returnTo: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(LoginRoute)
);
export const towersRouter = pipe(literal("towers"), Route.mapTo(TowersRoute));
export const privacyRouter = pipe(literal("privacy"), Route.mapTo(PrivacyRoute));

const routeParser = Route.oneOf(homeRouter, loginRouter, towersRouter, privacyRouter);

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute);

/** /login, carrying the page to return to after signing in. */
export const loginHref = (returnTo: Option.Option<string>): string => loginRouter({ returnTo, error: Option.none() });

/** The server-owned start of the sign-in round trip. */
export const startLoginHref = (returnTo: Option.Option<string>): string =>
    Option.match(returnTo, {
        onNone: () => "/auth/login",
        onSome: (destination) => `/auth/login?returnTo=${encodeURIComponent(destination)}`,
    });

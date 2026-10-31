import { Option, Schema as S, pipe } from "effect";

import { Route } from "foldkit";
import { defineRouteUnion, literal, schemaSegment, slash } from "foldkit/route";

import { LinkableGame } from "./linkableGames.ts";

export const AppRoute = defineRouteUnion({
    Home: {},
    About: {},
    Login: { returnTo: S.Option(S.String), error: S.Option(S.String) },
    Privacy: {},
    Terms: {},
    Sponsors: {},
    Developers: {},
    DeveloperApps: {},
    TowerMe: {},
    TowerLink: { game: LinkableGame },
    Account: { link: S.Option(S.String), error: S.Option(S.String) },
    Trades: { connected: S.Option(S.String), error: S.Option(S.String) },
    TradeDetail: { tradeId: S.String },
    NotFound: { path: S.String },
});
export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home));
export const aboutRouter = pipe(literal("about"), Route.mapTo(AppRoute.About));
// The oauth callback reports a failed sign in through the `error` query
// parameter; the page opens saying so rather than pretending nothing happened.
export const loginRouter = pipe(
    literal("login"),
    Route.query(S.Struct({ returnTo: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AppRoute.Login)
);
export const privacyRouter = pipe(literal("privacy"), Route.mapTo(AppRoute.Privacy));
export const termsRouter = pipe(literal("terms"), Route.mapTo(AppRoute.Terms));
export const sponsorsRouter = pipe(literal("sponsors"), Route.mapTo(AppRoute.Sponsors));
export const developersRouter = pipe(literal("developers"), Route.mapTo(AppRoute.Developers));
export const developerAppsRouter = pipe(
    literal("developers"),
    slash(literal("apps")),
    Route.mapTo(AppRoute.DeveloperApps)
);
export const towerMeRouter = pipe(literal("towers"), slash(literal("@me")), Route.mapTo(AppRoute.TowerMe));
export const towerLinkRouter = pipe(
    literal("towers"),
    slash(literal("@link")),
    slash(schemaSegment("game", LinkableGame)),
    Route.mapTo(AppRoute.TowerLink)
);
// The oauth callback reports how connecting another provider went: `link` when
// it worked, `error` when it did not. The page opens saying so either way.
export const accountRouter = pipe(
    literal("account"),
    Route.query(S.Struct({ link: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AppRoute.Account)
);
// The treasury's connect flow lands back on /trades with its outcome in the
// query; the page opens saying how it went.
export const tradesRouter = pipe(
    literal("trades"),
    Route.query(S.Struct({ connected: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AppRoute.Trades)
);
export const tradeDetailRouter = pipe(
    literal("trades"),
    slash(schemaSegment("tradeId", S.String)),
    Route.mapTo(AppRoute.TradeDetail)
);

const routeParser = Route.oneOf(
    homeRouter,
    aboutRouter,
    loginRouter,
    privacyRouter,
    termsRouter,
    sponsorsRouter,
    developerAppsRouter,
    developersRouter,
    towerMeRouter,
    towerLinkRouter,
    accountRouter,
    // Detail before list: /trades/<id> must not fall through to /trades.
    tradeDetailRouter,
    tradesRouter
);

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound);

/** /login, carrying the page to return to after signing in. */
export const loginHref = (returnTo: Option.Option<string>): string => loginRouter({ returnTo, error: Option.none() });

import { Option, Schema as S, pipe } from "effect";

import { Route } from "foldkit";
import { literal, r, slash } from "foldkit/route";

export const HomeRoute = r("Home");
export const AboutRoute = r("About");
export const LoginRoute = r("Login", { returnTo: S.Option(S.String), error: S.Option(S.String) });
export const PrivacyRoute = r("Privacy");
export const TermsRoute = r("Terms");
export const SponsorsRoute = r("Sponsors");
export const DevelopersRoute = r("Developers");
export const DeveloperAppsRoute = r("DeveloperApps");
export const TowerMeRoute = r("TowerMe");
export const TowerLinkRoute = r("TowerLink");
export const AccountRoute = r("Account", { link: S.Option(S.String), error: S.Option(S.String) });
export const NotFoundRoute = r("NotFound", { path: S.String });

export const AppRoute = S.Union([
    HomeRoute,
    AboutRoute,
    LoginRoute,
    PrivacyRoute,
    TermsRoute,
    SponsorsRoute,
    DevelopersRoute,
    DeveloperAppsRoute,
    TowerMeRoute,
    TowerLinkRoute,
    AccountRoute,
    NotFoundRoute,
]);
export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute));
export const aboutRouter = pipe(literal("about"), Route.mapTo(AboutRoute));
// The oauth callback reports a failed sign in through the `error` query
// parameter; the page opens saying so rather than pretending nothing happened.
export const loginRouter = pipe(
    literal("login"),
    Route.query(S.Struct({ returnTo: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(LoginRoute)
);
export const privacyRouter = pipe(literal("privacy"), Route.mapTo(PrivacyRoute));
export const termsRouter = pipe(literal("terms"), Route.mapTo(TermsRoute));
export const sponsorsRouter = pipe(literal("sponsors"), Route.mapTo(SponsorsRoute));
export const developersRouter = pipe(literal("developers"), Route.mapTo(DevelopersRoute));
export const developerAppsRouter = pipe(literal("developers"), slash(literal("apps")), Route.mapTo(DeveloperAppsRoute));
export const towerMeRouter = pipe(literal("towers"), slash(literal("@me")), Route.mapTo(TowerMeRoute));
export const towerLinkRouter = pipe(literal("towers"), slash(literal("@link")), Route.mapTo(TowerLinkRoute));
// The oauth callback reports how connecting another provider went: `link` when
// it worked, `error` when it did not. The page opens saying so either way.
export const accountRouter = pipe(
    literal("account"),
    Route.query(S.Struct({ link: S.OptionFromOptional(S.String), error: S.OptionFromOptional(S.String) })),
    Route.mapTo(AccountRoute)
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
    accountRouter
);

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute);

/** /login, carrying the page to return to after signing in. */
export const loginHref = (returnTo: Option.Option<string>): string => loginRouter({ returnTo, error: Option.none() });

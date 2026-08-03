import { type Option, pipe, Schema as S } from "effect";

import { Route } from "foldkit";
import { literal, r, slash } from "foldkit/route";

export const HomeRoute = r("Home");
export const AboutRoute = r("About");
export const LoginRoute = r("Login", { returnTo: S.Option(S.String) });
export const PrivacyRoute = r("Privacy");
export const TermsRoute = r("Terms");
export const SponsorsRoute = r("Sponsors");
export const DevelopersRoute = r("Developers");
export const DeveloperAppsRoute = r("DeveloperApps");
export const TowerMeRoute = r("TowerMe");
export const TowerLinkRoute = r("TowerLink");
export const ConsentRoute = r("Consent", { request: S.Option(S.String) });
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
    ConsentRoute,
    NotFoundRoute,
]);
export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute));
export const aboutRouter = pipe(literal("about"), Route.mapTo(AboutRoute));
export const loginRouter = pipe(
    literal("login"),
    Route.query(S.Struct({ returnTo: S.OptionFromOptional(S.String) })),
    Route.mapTo(LoginRoute)
);
export const privacyRouter = pipe(literal("privacy"), Route.mapTo(PrivacyRoute));
export const termsRouter = pipe(literal("terms"), Route.mapTo(TermsRoute));
export const sponsorsRouter = pipe(literal("sponsors"), Route.mapTo(SponsorsRoute));
export const developersRouter = pipe(literal("developers"), Route.mapTo(DevelopersRoute));
export const developerAppsRouter = pipe(literal("developers"), slash(literal("apps")), Route.mapTo(DeveloperAppsRoute));
export const towerMeRouter = pipe(literal("towers"), slash(literal("@me")), Route.mapTo(TowerMeRoute));
export const towerLinkRouter = pipe(literal("towers"), slash(literal("@link")), Route.mapTo(TowerLinkRoute));
export const consentRouter = pipe(
    literal("oauth"),
    slash(literal("consent")),
    Route.query(S.Struct({ request: S.OptionFromOptional(S.String) })),
    Route.mapTo(ConsentRoute)
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
    consentRouter
);

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute);

/** /login, carrying the page to return to after signing in. */
export const loginHref = (returnTo: Option.Option<string>): string => loginRouter({ returnTo });

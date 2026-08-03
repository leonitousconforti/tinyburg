import { Effect, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { Command, Http } from "foldkit";
import { m } from "foldkit/message";
import { ts } from "foldkit/schema";

import { CurrentUser, OAuthApp, TinyburgApi } from "../shared/api.ts";

// Who is signed in. Any failure to load the session is treated as signed out,
// matching the old server middleware.
export const SessionUnknown = ts("SessionUnknown");
export const SignedOut = ts("SignedOut");
export const SignedIn = ts("SignedIn", { user: CurrentUser });
export const SessionState = S.Union([SessionUnknown, SignedOut, SignedIn]);
export type SessionState = typeof SessionState.Type;

export const AppsIdle = ts("AppsIdle");
export const AppsLoading = ts("AppsLoading");
export const AppsLoaded = ts("AppsLoaded", { apps: S.Array(OAuthApp) });
export const AppsFailed = ts("AppsFailed");
export const AppsState = S.Union([AppsIdle, AppsLoading, AppsLoaded, AppsFailed]);
export type AppsState = typeof AppsState.Type;

export const GotSession = m("GotSession", { session: SessionState });
export const GotDeveloperApps = m("GotDeveloperApps", { apps: AppsState });

export const FetchMe = Command.define("FetchMe", {
    messages: [GotSession],
    execute: Effect.gen(function* () {
        const client = yield* HttpApiClient.make(TinyburgApi);
        const user = yield* client.SessionGroup.me();
        return GotSession({ session: SignedIn({ user }) });
    }).pipe(
        Effect.catch(() => Effect.succeed(GotSession({ session: SignedOut() }))),
        Effect.provide(Http.layer)
    ),
});

export const FetchDeveloperApps = Command.define("FetchDeveloperApps", {
    messages: [GotDeveloperApps],
    execute: Effect.gen(function* () {
        const client = yield* HttpApiClient.make(TinyburgApi);
        const apps = yield* client.DevelopersGroup.listApps();
        return GotDeveloperApps({ apps: AppsLoaded({ apps }) });
    }).pipe(
        Effect.catch(() => Effect.succeed(GotDeveloperApps({ apps: AppsFailed() }))),
        Effect.provide(Http.layer)
    ),
});

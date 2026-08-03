import { Context, Effect, Layer, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { AsyncData, Command, Http } from "foldkit";
import { m } from "foldkit/message";
import { ts } from "foldkit/schema";

import { CurrentUser, OAuthApp, TinyburgApi } from "../shared/api.ts";

/**
 * The derived TinyburgApi client. Built once at runtime boot through the
 * application's resources layer and shared by every Command; deriving it is
 * pure spec-walking, so there is no reason to repeat it per request.
 */
export class Api extends Context.Service<Api>()("@tinyburg/tinyburg.app/client/Api", {
    make: HttpApiClient.make(TinyburgApi),
}) {
    static readonly Default = Layer.effect(this, Api.make).pipe(Layer.provide(Http.layer));
}

// Who is signed in. Any failure to load the session is treated as signed out,
// matching the old server middleware.
export const SessionUnknown = ts("SessionUnknown");
export const SignedOut = ts("SignedOut");
export const SignedIn = ts("SignedIn", { user: CurrentUser });
export const SessionState = S.Union([SessionUnknown, SignedOut, SignedIn]);
export type SessionState = typeof SessionState.Type;

export const DeveloperApps = AsyncData.Schema(S.Array(OAuthApp), S.String);
export type DeveloperApps = typeof DeveloperApps.schema.Type;

export const GotSession = m("GotSession", { session: SessionState });
export const GotDeveloperApps = m("GotDeveloperApps", { apps: DeveloperApps.schema });

export const FetchMe = Command.define("FetchMe", {
    messages: [GotSession],
    execute: Effect.gen(function* () {
        const api = yield* Api;
        const user = yield* api.SessionGroup.me();
        return GotSession({ session: SignedIn({ user }) });
    }).pipe(Effect.catch(() => Effect.succeed(GotSession({ session: SignedOut() })))),
});

export const FetchDeveloperApps = Command.define("FetchDeveloperApps", {
    messages: [GotDeveloperApps, GotSession],
    execute: Effect.gen(function* () {
        const api = yield* Api;
        const apps = yield* api.DevelopersGroup.listApps();
        return GotDeveloperApps({ apps: DeveloperApps.Success({ data: apps }) });
    }).pipe(
        // The session is gone; flipping to signed out re-runs the route gating
        Effect.catchTag("Unauthorized", () => Effect.succeed(GotSession({ session: SignedOut() }))),
        Effect.catch((error) =>
            Effect.succeed(GotDeveloperApps({ apps: DeveloperApps.Failure({ error: String(error) }) }))
        )
    ),
});

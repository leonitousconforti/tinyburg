import { Context, Effect, Layer, Result, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { Api as TradingApi } from "@tinyburg/trading-sdk/Sdk";
import { AsyncData, Command, Http } from "foldkit";
import { m } from "foldkit/message";
import { ts } from "foldkit/schema";

import { User } from "../domain/models.ts";
import { AuthApi } from "../shared/auth.ts";

/**
 * The derived trading api client, built once at boot. Requests are same-origin
 * so the session cookie rides along on its own; the server trades it for the
 * bearer token the api actually requires.
 */
export class Api extends Context.Service<Api>()("@tinyburg/tinyburg.app/client/Api", {
    make: HttpApiClient.make(TradingApi),
}) {
    static readonly Default = Layer.effect(this, Api.make).pipe(Layer.provide(Http.layer));
}

/**
 * The derived client for the cookie-session api: who this browser is signed in
 * as, everywhere else it is signed in, and the providers it signs in through.
 */
export class Auth extends Context.Service<Auth>()("@tinyburg/tinyburg.app/client/Auth", {
    make: HttpApiClient.make(AuthApi),
}) {
    static readonly Default = Layer.effect(this, Auth.make).pipe(Layer.provide(Http.layer));
}

/** Everything a command may reach for, provided to the runtime at boot. */
export type Backend = Api | Auth;
export const BackendLive: Layer.Layer<Backend> = Layer.mergeAll(Api.Default, Auth.Default);

/**
 * The signed-in user, modelled with the same schema the session endpoint
 * serves. Nothing is re-exported from the api definition for this: the domain
 * model is the shared vocabulary, and the derived client's return type checks
 * the two stay one thing at the `SignedIn({ user })` below.
 */
export type SessionUser = typeof User.json.Type;

// Who is signed in. The app holds nothing: the cookie is the whole of its
// authentication, and it cannot read it.
export const SignedOut = ts("SignedOut");
export const CheckingSession = ts("CheckingSession");
export const SignedIn = ts("SignedIn", { user: User.json });
export const SessionState = S.Union([SignedOut, CheckingSession, SignedIn]);
export type SessionState = typeof SessionState.Type;

const LinkedTower = S.Struct({ playerId: S.String, createdAt: S.DateTimeUtc });

export const LinkedTowers = AsyncData.Schema(S.Array(LinkedTower), S.String);
export type LinkedTowers = typeof LinkedTowers.schema.Type;

export const GotSession = m("GotSession", { session: SessionState });

/** The outcome of a towers fetch; update folds it into the current state with
 *  `AsyncData.settle`, which keeps held data as Stale on failure. */
export const SettledLinkedTowers = m("SettledLinkedTowers", {
    result: S.Result(S.Array(LinkedTower), S.String),
});

/** Asks the server who this browser is. */
export const FetchSession = Command.define("FetchSession", {
    messages: [GotSession],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        const user = yield* auth.AuthGroup.session();
        return GotSession({ session: SignedIn({ user }) });
    }).pipe(
        // Unauthorized is a plain signed-out answer. Anything else gets the
        // same treatment, because a gated page cannot render on a maybe.
        Effect.catch(() => Effect.succeed(GotSession({ session: SignedOut() })))
    ),
});

export const FetchLinkedTowers = Command.define("FetchLinkedTowers", {
    messages: [SettledLinkedTowers, GotSession],
    execute: Effect.gen(function* () {
        const api = yield* Api;
        const towers = yield* api.LinkedTinyTowerAccountsGroup.TinyburgLinkedTinyTowerAccountsList();
        return SettledLinkedTowers({
            result: Result.succeed(towers.map((tower) => ({ playerId: tower.playerId, createdAt: tower.createdAt }))),
        });
    }).pipe(
        // The session expired or was signed out elsewhere; re-running the
        // gating sends the visitor back to login.
        Effect.catchTag("Unauthorized", () => Effect.succeed(GotSession({ session: SignedOut() }))),
        Effect.catch(() =>
            Effect.succeed(
                SettledLinkedTowers({ result: Result.fail("We couldn't load your towers. Please try again.") })
            )
        )
    ),
});

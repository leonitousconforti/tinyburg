import { Context, Effect, Layer, Result, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { AsyncData, Command, Http } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { ts } from "foldkit/schema";

import { Session } from "../domain/sessions.ts";
import { type ScopeCatalogArea, ScopeCatalogGame, type ScopeCatalogNode, SelfServiceApi } from "../shared/api.ts";

/**
 * The derived client for the cookie-session self-service api. Requests are
 * same-origin, so the session cookie rides along on its own.
 */
export class Self extends Context.Service<Self>()("@tinyburg/authproxy/client/Self", {
    make: HttpApiClient.make(SelfServiceApi),
}) {
    static readonly Default = Layer.effect(this, Self.make).pipe(Layer.provide(Http.layer));
}

/** Everything a command may reach for, provided to the runtime at boot. */
export type Backend = Self;
export const BackendLive: Layer.Layer<Backend> = Self.Default;

/**
 * The signed-in session, modelled with the same schema the session endpoint
 * serves. The derived client's return type checks the two stay one thing at
 * the `SignedIn({ session })` below.
 */
export type SessionInfo = typeof Session.json.Type;

// Who is signed in. The app holds nothing: the cookie is the whole of its
// authentication, and it cannot read it.
export const SignedOut = ts("SignedOut");
export const CheckingSession = ts("CheckingSession");
export const SignedIn = ts("SignedIn", { session: Session.json });
export const SessionState = S.Union([SignedOut, CheckingSession, SignedIn]);
export type SessionState = typeof SessionState.Type;

/**
 * The scopes as the proxy offers them, straight from the catalog endpoint:
 * one area per part of the api, each with a `:read` and a `:write` branch and
 * the leaves under those. The dashboard holds no list of its own: what it
 * shows is what the server read off the TinyTower endpoints, so a scope
 * cannot be offered here that is not enforced there.
 */
export type CatalogGame = typeof ScopeCatalogGame.Type;
export type CatalogArea = typeof ScopeCatalogArea.Type;
export type CatalogNode = typeof ScopeCatalogNode.Type;

const LoadFailed = S.Literals(["loadFailed"]);

export const ScopeCatalog = AsyncData.Schema(S.Array(ScopeCatalogGame), LoadFailed);
export type ScopeCatalogData = typeof ScopeCatalog.schema.Type;

/**
 * What the backend tells the application.
 *
 * One union rather than a constructor per message: `defineMessageUnion`
 * declares the whole set at once and hangs the constructors off the result, so
 * the union and its members cannot drift apart.
 */
export const BackendMessage = defineMessageUnion({
    GotSession: { session: SessionState },
    SettledScopes: { result: S.Result(S.Array(ScopeCatalogGame), LoadFailed) },
});
export type BackendMessage = typeof BackendMessage.Type;

/** Asks the server who this browser is. */
export const FetchSession = Command.define("FetchSession", {
    messages: [BackendMessage.GotSession],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const session = yield* self.SelfServiceGroup.session();
        return BackendMessage.GotSession({ session: SignedIn({ session }) });
    }).pipe(
        // Unauthorized is a plain signed-out answer. Anything else gets the
        // same treatment, because a gated page cannot render on a maybe.
        Effect.orElseSucceed(() => BackendMessage.GotSession({ session: SignedOut() }))
    ),
});

/** Asks the server which scopes it hands out, and what each one means. */
export const FetchScopes = Command.define("FetchScopes", {
    messages: [BackendMessage.SettledScopes],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const catalog = yield* self.ScopesGroup.catalog();
        return BackendMessage.SettledScopes({ result: Result.succeed(catalog) });
    }).pipe(Effect.orElseSucceed(() => BackendMessage.SettledScopes({ result: Result.fail("loadFailed" as const) }))),
});

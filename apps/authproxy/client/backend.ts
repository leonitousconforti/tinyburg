import { Context, Effect, Layer, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { Command, Http } from "foldkit";
import { m } from "foldkit/message";
import { ts } from "foldkit/schema";

import { Session } from "../domain/sessions.ts";
import { SelfServiceApi } from "../shared/api.ts";

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

export const GotSession = m("GotSession", { session: SessionState });

/** Asks the server who this browser is. */
export const FetchSession = Command.define("FetchSession", {
    messages: [GotSession],
    execute: Effect.gen(function* () {
        const self = yield* Self;
        const session = yield* self.SelfServiceGroup.session();
        return GotSession({ session: SignedIn({ session }) });
    }).pipe(
        // Unauthorized is a plain signed-out answer. Anything else gets the
        // same treatment, because a gated page cannot render on a maybe.
        Effect.catch(() => Effect.succeed(GotSession({ session: SignedOut() })))
    ),
});

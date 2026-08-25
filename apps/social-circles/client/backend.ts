import { Context, Effect, Layer, Schema as S } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";

import { Command, Http } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { ts } from "foldkit/schema";

import { Session } from "../domain/sessions.ts";
import { SelfServiceApi } from "../shared/api.ts";

/**
 * The derived client for the cookie-session api. Requests are same-origin, so
 * the session cookie rides along on its own and the app never handles a token.
 */
export class Self extends Context.Service<Self>()("@tinyburg/social-circles/client/Self", {
    make: HttpApiClient.make(SelfServiceApi),
}) {
    static readonly Default = Layer.effect(Self, Self.make).pipe(Layer.provide(Http.layer));
}

/** Everything a command may reach for, provided to the runtime at boot. */
export type Backend = Self;
export const BackendLive: Layer.Layer<Backend> = Self.Default;

/**
 * The signed-in session, modelled with the same schema the session endpoint
 * serves, so the two cannot drift.
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
 * What the backend tells the application.
 *
 * One union rather than a constructor per message: `defineMessageUnion`
 * declares the whole set at once and hangs the constructors off the result, so
 * the union and its members cannot drift apart.
 */
export const BackendMessage = defineMessageUnion({
    GotSession: { session: SessionState },
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
        Effect.catch(() => Effect.succeed(BackendMessage.GotSession({ session: SignedOut() })))
    ),
});

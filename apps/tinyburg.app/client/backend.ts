import { Context, Effect, Layer, Option, Ref, Schema as S } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { Api as TradingApi } from "@tinyburg/trading-sdk/Sdk";
import { AsyncData, Command, Http } from "foldkit";
import { m } from "foldkit/message";
import { ts } from "foldkit/schema";

import { type Account, beginAuthorization, completeAuthorization, Credentials } from "./auth.ts";

/**
 * The access token the api client presents. It lives in a Ref rather than in
 * the Model because the client is built once at boot, while the token arrives
 * later and is replaced on every sign in.
 */
export class Token extends Context.Service<Token>()("@tinyburg/tinyburg.app/client/Token", {
    make: Ref.make(Option.none<string>()),
}) {
    static readonly Default = Layer.effect(this, Token.make);
}

/**
 * The derived trading api client, built once at boot. Every request carries
 * the current bearer token; the api has no other way in.
 */
export class Api extends Context.Service<Api>()("@tinyburg/tinyburg.app/client/Api", {
    make: Effect.gen(function* () {
        const token = yield* Token;
        return yield* HttpApiClient.make(TradingApi, {
            transformClient: HttpClient.mapRequestEffect((request: HttpClientRequest.HttpClientRequest) =>
                Effect.map(Ref.get(token), (maybeToken) =>
                    Option.match(maybeToken, {
                        onNone: () => request,
                        onSome: (bearer) => HttpClientRequest.bearerToken(request, bearer),
                    })
                )
            ),
        });
    }),
}) {
    // Token is merged rather than hidden: the sign in commands write to it.
    static readonly Default = Layer.effect(this, Api.make).pipe(
        Layer.provideMerge(Token.Default),
        Layer.provide(Http.layer)
    );
}

// Who is signed in. The SPA holds no cookie: an access token in the Model is
// the whole of its authentication.
export const SignedOut = ts("SignedOut");
export const SigningIn = ts("SigningIn");
export const SignedIn = ts("SignedIn", { credentials: Credentials });
export const SessionState = S.Union([SignedOut, SigningIn, SignedIn]);
export type SessionState = typeof SessionState.Type;

export const LinkedTowers = AsyncData.Schema(
    S.Array(S.Struct({ playerId: S.String, createdAt: S.DateTimeUtc })),
    S.String
);
export type LinkedTowers = typeof LinkedTowers.schema.Type;

export const GotSession = m("GotSession", { session: SessionState });
export const GotSignInError = m("GotSignInError", { message: S.String });
export const GotLinkedTowers = m("GotLinkedTowers", { towers: LinkedTowers.schema });
export const CompletedSignIn = m("CompletedSignIn", { credentials: Credentials, returnTo: S.String });

/** Sends the browser to the provider to start the code flow. */
export const BeginSignIn = Command.define("BeginSignIn", {
    args: { returnTo: S.String },
    messages: [GotSignInError],
    execute: ({ returnTo }) =>
        beginAuthorization(returnTo).pipe(
            Effect.as(GotSignInError({ message: "" })),
            Effect.catch(() => Effect.succeed(GotSignInError({ message: "We couldn't start the sign in." })))
        ),
});

/** Finishes the code flow on the callback route and stores the token. */
export const CompleteSignIn = Command.define("CompleteSignIn", {
    args: { search: S.String },
    messages: [GotSession, GotSignInError, CompletedSignIn],
    execute: ({ search }) =>
        Effect.gen(function* () {
            const token = yield* Token;
            const { credentials, returnTo } = yield* completeAuthorization(search);
            yield* Ref.set(token, Option.some(credentials.accessToken));
            return CompletedSignIn({ credentials, returnTo });
        }).pipe(
            Effect.catch((error) => Effect.succeed(GotSignInError({ message: error.message }))),
            // The token exchange talks to the provider directly rather than
            // through the api client, so it brings its own http client.
            Effect.provide(Http.layer)
        ),
});

export const FetchLinkedTowers = Command.define("FetchLinkedTowers", {
    messages: [GotLinkedTowers, GotSession],
    execute: Effect.gen(function* () {
        const api = yield* Api;
        const towers = yield* api.LinkedTinyTowerAccountsGroup.TinyburgLinkedTinyTowerAccountsList();
        return GotLinkedTowers({
            towers: LinkedTowers.Success({
                data: towers.map((tower) => ({ playerId: tower.playerId, createdAt: tower.createdAt })),
            }),
        });
    }).pipe(
        // The token expired or was revoked; signing out re-runs the gating
        Effect.catchTag("Unauthorized", () => Effect.succeed(GotSession({ session: SignedOut() }))),
        Effect.catch(() =>
            Effect.succeed(
                GotLinkedTowers({
                    towers: LinkedTowers.Failure({ error: "We couldn't load your towers. Please try again." }),
                })
            )
        )
    ),
});

export type { Account };

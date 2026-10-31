import { Clock, Context, Effect, Layer, Option, Result, Schema as S, SynchronizedRef } from "effect";
import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { Api as TinyburgApi } from "@tinyburg/tinyburg-sdk/Sdk";
import { Api as TreasuryApi, TreasuryStats } from "@tinyburg/treasury-sdk/Sdk";
import { AsyncData, Command, Http } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { taggedStruct } from "foldkit/schema";

import { User } from "../domain/models.ts";
import { AuthApi } from "../shared/auth.ts";

/**
 * The derived tinyburg api client, built once at boot. Requests are same-origin
 * so the session cookie rides along on its own, and the server accepts it in
 * place of a bearer token, for the scopes it grants the first party.
 */
export class Api extends Context.Service<Api>()("@tinyburg/tinyburg.app/client/Api", {
    make: HttpApiClient.make(TinyburgApi),
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

/**
 * What `/auth/token` answers with. The response also carries `token_type`
 * (always `Bearer`) and `scope`; neither changes what this tab does with the
 * token, so neither is decoded.
 */
const TokenResponse = S.Struct({ access_token: S.String, expires_in: S.Finite });

interface HeldToken {
    readonly value: string;
    /** Epoch milliseconds, already pulled in by the margin below. */
    readonly renewAt: number;
}

/** Renewed this long before the server says it lapses, so no request carries a token in its final seconds. */
const RENEW_MARGIN_SECONDS = 30;

interface FirstPartyToken {
    readonly usable: (
        refused: Option.Option<string>
    ) => Effect.Effect<Option.Option<string>, HttpClientError.HttpClientError>;
}

/**
 * The browser's access token for the Tinyburg api. The session cookie is not
 * a token, so tinyburg.app's `/auth/token` mints a short-lived JWT for it
 * (same-origin only, cookie required). The token lives in this closure and
 * nowhere else: never in storage, gone with the tab.
 *
 * `usable` answers with the held token while it is good and otherwise mints
 * one. Passing the token an api just refused forces a fresh one, unless
 * another request already replaced it. The ref serializes minting, so the
 * requests a page fires together share a single trip to `/auth/token`.
 * `None` means the server says this browser has no session.
 */
const makeFirstPartyToken = (http: HttpClient.HttpClient): Effect.Effect<FirstPartyToken> =>
    Effect.gen(function* () {
        const held = yield* SynchronizedRef.make(Option.none<HeldToken>());

        const mint = Effect.gen(function* () {
            const response = yield* http.get("/auth/token");
            if (response.status === 401) return Option.none<HeldToken>();
            yield* HttpClientResponse.filterStatusOk(response);
            const body = yield* HttpClientResponse.schemaBodyJson(TokenResponse)(response).pipe(
                Effect.catchTag("SchemaError", (cause) =>
                    Effect.fail(
                        new HttpClientError.HttpClientError({
                            reason: new HttpClientError.DecodeError({ request: response.request, response, cause }),
                        })
                    )
                )
            );
            const now = yield* Clock.currentTimeMillis;
            const lifetime = Math.max(0, body.expires_in - RENEW_MARGIN_SECONDS);
            return Option.some<HeldToken>({ value: body.access_token, renewAt: now + lifetime * 1000 });
        });

        const usable = (refused: Option.Option<string>) =>
            SynchronizedRef.modifyEffect(held, (token) =>
                Effect.gen(function* () {
                    const now = yield* Clock.currentTimeMillis;
                    const keep = Option.filter(
                        token,
                        (current) => current.renewAt > now && !Option.contains(refused, current.value)
                    );
                    const next = Option.isSome(keep) ? keep : yield* mint;
                    return [Option.map(next, (current) => current.value), next] as const;
                })
            );

        return { usable };
    });

/**
 * Sends every request with the first-party bearer token. A `401` on a request
 * that carried one means the api stopped accepting it before this tab
 * expected (a key rotation, a clock disagreement), so it is retried once with
 * a fresh token. A browser with no session sends the request bare and lets
 * the api's own `401` answer for it.
 */
const withFirstPartyToken = (http: HttpClient.HttpClient, token: FirstPartyToken): HttpClient.HttpClient => {
    const send = (request: HttpClientRequest.HttpClientRequest, bearer: Option.Option<string>) =>
        http.execute(
            Option.match(bearer, {
                onNone: () => request,
                onSome: (value) => HttpClientRequest.bearerToken(request, value),
            })
        );

    return HttpClient.transform(http, (_unauthenticated, request) =>
        Effect.gen(function* () {
            const bearer = yield* token.usable(Option.none());
            const response = yield* send(request, bearer);
            if (response.status !== 401 || Option.isNone(bearer)) return response;
            return yield* send(request, yield* token.usable(bearer));
        })
    );
};

/**
 * The derived treasury client. Requests go to this same origin, whose
 * `/v1/treasury/*` proxy forwards them, `Authorization` included, to the
 * treasury service. Only the trade endpoints carry a token: the public
 * stats are read by signed out visitors too, and asking `/auth/token` on
 * their behalf would only ever be refused.
 */
export class Treasury extends Context.Service<Treasury>()("@tinyburg/tinyburg.app/client/Treasury", {
    make: Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient;
        const token = yield* makeFirstPartyToken(http);
        return {
            TreasuryGroup: yield* HttpApiClient.group(TreasuryApi, {
                group: "TreasuryGroup",
                httpClient: withFirstPartyToken(http, token),
            }),
            TreasuryPublicGroup: yield* HttpApiClient.group(TreasuryApi, {
                group: "TreasuryPublicGroup",
                httpClient: http,
            }),
        };
    }),
}) {
    static readonly Default = Layer.effect(this, Treasury.make).pipe(Layer.provide(Http.layer));
}

/** Everything a command may reach for, provided to the runtime at boot. */
export type Backend = Api | Auth | Treasury;
export const BackendLive: Layer.Layer<Backend> = Layer.mergeAll(Api.Default, Auth.Default, Treasury.Default);

/**
 * The signed-in user, modelled with the same schema the session endpoint
 * serves. Nothing is re-exported from the api definition for this: the domain
 * model is the shared vocabulary, and the derived client's return type checks
 * the two stay one thing at the `SignedIn({ user })` below.
 */
export type SessionUser = typeof User.json.Type;

// Who is signed in. The app holds nothing: the cookie is the whole of its
// authentication, and it cannot read it.
export const SignedOut = taggedStruct("SignedOut");
export const CheckingSession = taggedStruct("CheckingSession");
export const SignedIn = taggedStruct("SignedIn", { user: User.json });
export const SessionState = S.Union([SignedOut, CheckingSession, SignedIn]);
export type SessionState = typeof SessionState.Type;

const LinkedTower = S.Struct({ playerId: S.String, createdAt: S.DateTimeUtc });

// The failure is a key the view resolves into the visitor's language, not a
// finished sentence: this command runs without knowing which language that is.
export const LinkedTowers = AsyncData.Schema(S.Array(LinkedTower), S.Literals(["loadFailed"]));
export type LinkedTowers = typeof LinkedTowers.schema.Type;

/** The treasury's public counters, for the home page's stat tiles. */
export const Stats = AsyncData.Schema(TreasuryStats, S.Literals(["loadFailed"]));
export type Stats = typeof Stats.schema.Type;

/**
 * What the backend tells the application.
 *
 * One union rather than a constructor per message: `defineMessageUnion`
 * declares the whole set at once and hangs the constructors off the result, so
 * the union and its members cannot drift apart.
 */
export const BackendMessage = defineMessageUnion({
    GotSession: { session: SessionState },

    /** The outcome of a towers fetch; update folds it into the current state with
     *  `AsyncData.settle`, which keeps held data as Stale on failure. */
    SettledLinkedTowers: { result: S.Result(S.Array(LinkedTower), S.Literals(["loadFailed"])) },

    SettledStats: { result: S.Result(TreasuryStats, S.Literals(["loadFailed"])) },
});
export type BackendMessage = typeof BackendMessage.Type;

/** Asks the server who this browser is. */
export const FetchSession = Command.define("FetchSession", {
    messages: [BackendMessage.GotSession],
    execute: Effect.gen(function* () {
        const auth = yield* Auth;
        const user = yield* auth.AuthGroup.session();
        return BackendMessage.GotSession({ session: SignedIn({ user }) });
    }).pipe(
        // Unauthorized is a plain signed-out answer. Anything else gets the
        // same treatment, because a gated page cannot render on a maybe.
        Effect.catch(() => Effect.succeed(BackendMessage.GotSession({ session: SignedOut() })))
    ),
});

/**
 * The public counters for the front page. No session involved: the endpoint
 * is the treasury's one unauthenticated group, and the proxy forwards it
 * with or without a visitor signed in.
 */
export const FetchStats = Command.define("FetchStats", {
    messages: [BackendMessage.SettledStats],
    execute: Effect.gen(function* () {
        const treasury = yield* Treasury;
        const stats = yield* treasury.TreasuryPublicGroup.Stats();
        return BackendMessage.SettledStats({ result: Result.succeed(stats) });
    }).pipe(Effect.catch(() => Effect.succeed(BackendMessage.SettledStats({ result: Result.fail("loadFailed") })))),
});

export const FetchLinkedTowers = Command.define("FetchLinkedTowers", {
    messages: [BackendMessage.SettledLinkedTowers, BackendMessage.GotSession],
    execute: Effect.gen(function* () {
        const api = yield* Api;
        const towers = yield* api.TinyTowerAccountsGroup.ListAccounts();
        return BackendMessage.SettledLinkedTowers({
            result: Result.succeed(towers.map((tower) => ({ playerId: tower.playerId, createdAt: tower.createdAt }))),
        });
    }).pipe(
        // The session expired or was signed out elsewhere; re-running the
        // gating sends the visitor back to login.
        Effect.catchTag("Unauthorized", () => Effect.succeed(BackendMessage.GotSession({ session: SignedOut() }))),
        Effect.catch(() => Effect.succeed(BackendMessage.SettledLinkedTowers({ result: Result.fail("loadFailed") })))
    ),
});

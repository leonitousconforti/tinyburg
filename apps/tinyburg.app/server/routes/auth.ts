import { Config, Effect, Layer, Option, Schema } from "effect";
import { HttpEffect, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { AuthApi, CurrentSession, SessionCookie } from "../../shared/auth.ts";
import { sha256 } from "../crypto.ts";

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

const SessionCookieLive = Layer.effect(
    SessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        return Effect.fnUntraced(function* (httpEffect) {
            const maybeCurrentUser = yield* SessionsRepository.maybeCurrentUser.pipe(
                Effect.provideService(SessionsRepository, sessions)
            );

            if (Option.isNone(maybeCurrentUser)) {
                return yield* new HttpApiError.Unauthorized();
            }

            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
                Effect.succeed(HttpServerResponse.setHeader(response, "cache-control", "no-store"))
            );

            return yield* Effect.provideService(httpEffect, CurrentSession, maybeCurrentUser.value);
        });
    })
);

const expireSessionCookie = Effect.gen(function* () {
    const secureCookies = yield* Effect.orDie(SecureCookies);
    yield* HttpEffect.appendPreResponseHandler((_request, response) =>
        Effect.orDie(
            HttpServerResponse.expireCookie(response, SessionsRepository.PROVIDER_SESSION_COOKIE_NAME, {
                httpOnly: true,
                path: "/",
                secure: secureCookies,
                sameSite: "lax",
            })
        )
    );
});

const AuthGroupLive = HttpApiBuilder.group(
    AuthApi,
    "AuthGroup",
    Effect.fnUntraced(function* (handlers) {
        return handlers
            .handle("session", () => Effect.map(CurrentSession, ({ user }) => user))
            .handle("sessions", () =>
                Effect.gen(function* () {
                    const { session: current, user } = yield* CurrentSession;
                    const sessions = yield* Effect.orDie(SessionsRepository.use((repo) => repo.listForUser(user.id)));
                    return sessions.map((found) => ({ ...found, current: found.id === current.id }));
                })
            )
            .handle("revokeSession", ({ params }) =>
                Effect.gen(function* () {
                    const { session: current, user } = yield* CurrentSession;
                    const revoked = yield* Effect.orDie(
                        SessionsRepository.use((repo) =>
                            repo.revokeSession({
                                sessionId: params.sessionId,
                                userId: user.id,
                            })
                        )
                    );

                    const signedOut = revoked && params.sessionId === current.id;
                    if (signedOut) yield* expireSessionCookie;
                    return { revoked: revoked ? 1 : 0, signedOut };
                })
            )
            .handle("revokeSessions", ({ query }) =>
                Effect.gen(function* () {
                    const { session: current, user } = yield* CurrentSession;
                    const revoked = yield* Effect.orDie(
                        SessionsRepository.use((repo) =>
                            repo.revokeSessionsForUser({
                                exceptSessionId: query.scope === "others" ? Option.some(current.id) : Option.none(),
                                userId: user.id,
                            })
                        )
                    );

                    if (query.scope === "all") yield* expireSessionCookie;
                    return { revoked, signedOut: query.scope === "all" };
                })
            )
            .handle("accounts", () =>
                Effect.gen(function* () {
                    const { user } = yield* CurrentSession;
                    return yield* Effect.orDie(UsersRepository.use((repo) => repo.listOAuthAccounts(user.id)));
                })
            )
            .handle("unlinkAccount", ({ params }) =>
                Effect.gen(function* () {
                    const { user } = yield* CurrentSession;
                    const unlinked = yield* Effect.orDie(
                        UsersRepository.use((repo) => repo.unlinkOAuthAccount({ userId: user.id, ...params }))
                    );

                    if (!unlinked) return yield* new HttpApiError.Conflict();
                })
            );
    })
);

const logout = Effect.gen(function* () {
    const cookies = yield* HttpServerRequest.schemaCookies(
        Schema.Struct({
            [SessionsRepository.PROVIDER_SESSION_COOKIE_NAME]: Schema.String,
        })
    ).pipe(Effect.option);

    if (Option.isSome(cookies)) {
        const tokenHash = yield* sha256(cookies.value[SessionsRepository.PROVIDER_SESSION_COOKIE_NAME]);
        yield* Effect.orDie(SessionsRepository.use((repo) => repo.revokeSessionByTokenHash(tokenHash)));
    }

    const secureCookies = yield* SecureCookies;
    return yield* HttpServerResponse.expireCookie(
        HttpServerResponse.redirect("/"),
        SessionsRepository.PROVIDER_SESSION_COOKIE_NAME,
        {
            httpOnly: true,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
        }
    );
});

export const AuthRoutesLive = Layer.mergeAll(
    HttpApiBuilder.layer(AuthApi).pipe(Layer.provide(AuthGroupLive), Layer.provide(SessionCookieLive)),
    HttpRouter.add("GET", "/logout", logout)
);

import { Effect, Layer, Option } from "effect";
import { HttpEffect, HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { AuthApi, CurrentSession, SessionCookie } from "../../shared/auth.ts";
import { cookieName, maybeCurrentUser, PROVIDER_SESSION_COOKIE_NAME, readCookie, SecureCookies } from "../cookies.ts";
import { sha256 } from "../crypto.ts";

const SessionCookieLive = Layer.effect(
    SessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        return Effect.fnUntraced(function* (httpEffect) {
            const currentUser = yield* maybeCurrentUser.pipe(Effect.provideService(SessionsRepository, sessions));

            if (Option.isNone(currentUser)) {
                return yield* new HttpApiError.Unauthorized();
            }

            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
                Effect.succeed(HttpServerResponse.setHeader(response, "cache-control", "no-store"))
            );

            return yield* Effect.provideService(httpEffect, CurrentSession, currentUser.value);
        });
    })
);

const expireSessionCookie = Effect.gen(function* () {
    const secureCookies = yield* Effect.orDie(SecureCookies);
    const name = yield* Effect.orDie(cookieName(PROVIDER_SESSION_COOKIE_NAME));
    yield* HttpEffect.appendPreResponseHandler((_request, response) =>
        Effect.orDie(
            HttpServerResponse.expireCookie(response, name, {
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
    const sessionToken = yield* Effect.orDie(readCookie(PROVIDER_SESSION_COOKIE_NAME));
    if (Option.isSome(sessionToken)) {
        const tokenHash = yield* sha256(sessionToken.value);
        yield* Effect.orDie(SessionsRepository.use((repo) => repo.revokeSessionByTokenHash(tokenHash)));
    }

    const secureCookies = yield* SecureCookies;
    return yield* HttpServerResponse.expireCookie(
        HttpServerResponse.redirect("/"),
        yield* cookieName(PROVIDER_SESSION_COOKIE_NAME),
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
    HttpRouter.add("POST", "/logout", logout)
);

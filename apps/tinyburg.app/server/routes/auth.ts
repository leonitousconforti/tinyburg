import { Effect, Layer, Option } from "effect";
import { HttpEffect, HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { SessionsRepository } from "../../domain/sessions.ts";
import { UsersRepository } from "../../domain/users.ts";
import { AuthApi, CurrentSession, SessionCookie } from "../../shared/auth.ts";
import { CookiePolicy, maybeCurrentUser, PROVIDER_SESSION_COOKIE_NAME } from "../cookies.ts";

const SessionCookieLive = Layer.effect(
    SessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;

        return Effect.fnUntraced(function* (httpEffect) {
            const currentUser = yield* maybeCurrentUser.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(CookiePolicy, cookiePolicy),
                Effect.mapError(() => new HttpApiError.InternalServerError())
            );

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
    const cookies = yield* CookiePolicy;
    yield* HttpEffect.appendPreResponseHandler((_request, response) =>
        Effect.succeed(
            HttpServerResponse.expireCookieUnsafe(response, cookies.name(PROVIDER_SESSION_COOKIE_NAME), {
                httpOnly: true,
                path: "/",
                secure: cookies.secure,
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
                    const sessions = yield* SessionsRepository.use((repo) => repo.listForUser(user.id));
                    // The payload is serialized before it leaves this call, so the class prototype is irrelevant.
                    // oxlint-disable-next-line typescript/no-misused-spread
                    return sessions.map((found) => ({ ...found, current: found.id === current.id }));
                }).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()))
            )
            .handle("revokeSession", ({ params }) =>
                Effect.gen(function* () {
                    const { session: current, user } = yield* CurrentSession;
                    const revoked = yield* SessionsRepository.use((repo) =>
                        repo.revokeSession({
                            sessionId: params.sessionId,
                            userId: user.id,
                        })
                    );

                    const signedOut = revoked && params.sessionId === current.id;
                    if (signedOut) yield* expireSessionCookie;
                    return { revoked: revoked ? 1 : 0, signedOut };
                }).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()))
            )
            .handle("revokeSessions", ({ query }) =>
                Effect.gen(function* () {
                    const { session: current, user } = yield* CurrentSession;
                    const revoked = yield* SessionsRepository.use((repo) =>
                        repo.revokeSessionsForUser({
                            exceptSessionId: query.scope === "others" ? Option.some(current.id) : Option.none(),
                            userId: user.id,
                        })
                    );

                    if (query.scope === "all") yield* expireSessionCookie;
                    return { revoked, signedOut: query.scope === "all" };
                }).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()))
            )
            .handle("accounts", () =>
                Effect.gen(function* () {
                    const { user } = yield* CurrentSession;
                    return yield* UsersRepository.use((repo) => repo.listOAuthAccounts(user.id));
                }).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()))
            )
            .handle("unlinkAccount", ({ params }) =>
                // The early exits return never-typed values; the normal path runs to the end.
                // oxlint-disable-next-line typescript/consistent-return
                Effect.gen(function* () {
                    const { user } = yield* CurrentSession;
                    const unlinked = yield* UsersRepository.use((repo) =>
                        repo.unlinkOAuthAccount({ userId: user.id, ...params })
                    );

                    if (!unlinked) return yield* new HttpApiError.Conflict();
                }).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()))
            );
    })
);

const logout = Effect.gen(function* () {
    const cookies = yield* CookiePolicy;
    const maybeUser = yield* maybeCurrentUser;
    if (Option.isSome(maybeUser)) {
        yield* SessionsRepository.use((repo) => repo.revokeSessionByTokenHash(maybeUser.value.session.tokenHash));
    }

    return yield* HttpServerResponse.expireCookie(
        HttpServerResponse.redirect("/"),
        cookies.name(PROVIDER_SESSION_COOKIE_NAME),
        {
            httpOnly: true,
            path: "/",
            secure: cookies.secure,
            sameSite: "lax",
        }
    );
}).pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

export const AuthRoutesLive = Layer.mergeAll(
    HttpApiBuilder.layer(AuthApi).pipe(Layer.provide(AuthGroupLive), Layer.provide(SessionCookieLive)),
    HttpRouter.add("POST", "/logout", logout)
);

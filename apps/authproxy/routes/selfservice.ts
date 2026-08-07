import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { HttpEffect, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import { CookiePolicy, maybeCurrentSession } from "../cookies.ts";
import { Account, Repository } from "../domain/model.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { AdminSessionCookie, CurrentSession, SelfServiceApi, SessionCookie } from "../shared/api.ts";
import { DEFAULT_RATE_LIMIT, MAX_KEYS_PER_USER, SELF_SERVE_SCOPE_PATHS } from "../shared/scopes.ts";

const SessionCookieLive = Layer.effect(
    SessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;

        return Effect.fnUntraced(function* (httpEffect) {
            const currentSession = yield* maybeCurrentSession.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(CookiePolicy, cookiePolicy),
                Effect.mapError(() => new HttpApiError.InternalServerError())
            );

            if (Option.isNone(currentSession)) {
                return yield* new HttpApiError.Unauthorized();
            }

            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
                Effect.succeed(HttpServerResponse.setHeader(response, "cache-control", "no-store"))
            );

            return yield* Effect.provideService(httpEffect, CurrentSession, { session: currentSession.value });
        });
    })
);

const AdminSessionCookieLive = Layer.effect(
    AdminSessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;

        return Effect.fnUntraced(function* (httpEffect) {
            const currentSession = yield* maybeCurrentSession.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(CookiePolicy, cookiePolicy),
                Effect.mapError(() => new HttpApiError.InternalServerError())
            );

            if (Option.isNone(currentSession)) {
                return yield* new HttpApiError.Unauthorized();
            }

            // Elevation is checked here and only here; the handlers behind
            // this middleware never see a plain session.
            const now = yield* DateTime.now;
            const elevated = currentSession.value.adminUntil.pipe(
                Option.map((until) => DateTime.isGreaterThan(until, now)),
                Option.getOrElse(() => false)
            );
            if (!elevated) {
                return yield* new HttpApiError.Forbidden();
            }

            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
                Effect.succeed(HttpServerResponse.setHeader(response, "cache-control", "no-store"))
            );

            return yield* Effect.provideService(httpEffect, CurrentSession, { session: currentSession.value });
        });
    })
);

const SelfServiceGroupLive = HttpApiBuilder.group(
    SelfServiceApi,
    "SelfServiceGroup",
    Effect.fnUntraced(function* (handlers) {
        const repo = yield* Repository;

        return handlers
            .handle("session", () => Effect.map(CurrentSession, ({ session }) => session))
            .handle("listKeys", () =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    return yield* repo.listForOwner(session.sub);
                }).pipe(Effect.orDie)
            )
            .handle("createKey", ({ payload }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;

                    // Only catalogued read-only scopes are self-serve, and an
                    // empty key would be useless.
                    const scopes = new Set(payload.scopes);
                    const allowed =
                        scopes.size > 0 && payload.scopes.every((scope) => SELF_SERVE_SCOPE_PATHS.has(scope));
                    if (!allowed) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const { count } = yield* repo.countForOwner(session.sub).pipe(Effect.orDie);
                    if (count >= MAX_KEYS_PER_USER) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const newAccount = yield* Account.insert
                        .makeEffect({
                            scopes,
                            description: payload.description,
                            ownerSub: Option.some(session.sub),
                            rateLimitLimit: DEFAULT_RATE_LIMIT.limit,
                            rateLimitWindow: Duration.millis(DEFAULT_RATE_LIMIT.windowMillis),
                        })
                        .pipe(Effect.orDie);

                    return yield* repo.insert(newAccount).pipe(Effect.orDie);
                })
            )
            .handle("rotateKey", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    const rotated = yield* repo
                        .rotateForOwner({ key: params.key, ownerSub: session.sub })
                        .pipe(Effect.orDie);

                    return yield* Option.match(rotated, {
                        onNone: () => new HttpApiError.NotFound(),
                        onSome: Effect.succeed,
                    });
                })
            )
            .handle("revokeKey", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    const updated = yield* repo
                        .setRevokedForOwner({ key: params.key, ownerSub: session.sub, revoked: true })
                        .pipe(Effect.orDie);

                    return yield* Option.match(updated, {
                        onNone: () => new HttpApiError.NotFound(),
                        onSome: Effect.succeed,
                    });
                })
            )
            .handle("enableKey", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    const updated = yield* repo
                        .setRevokedForOwner({ key: params.key, ownerSub: session.sub, revoked: false })
                        .pipe(Effect.orDie);

                    return yield* Option.match(updated, {
                        onNone: () => new HttpApiError.NotFound(),
                        onSome: Effect.succeed,
                    });
                })
            )
            .handle("deleteKey", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    const deleted = yield* repo
                        .deleteForOwner({ key: params.key, ownerSub: session.sub })
                        .pipe(Effect.orDie);

                    if (Option.isNone(deleted)) {
                        return yield* new HttpApiError.NotFound();
                    }
                })
            );
    })
);

const AdminGroupLive = HttpApiBuilder.group(
    SelfServiceApi,
    "AdminGroup",
    Effect.fnUntraced(function* (handlers) {
        const repo = yield* Repository;

        const findAccount = (key: string) =>
            repo.findById(key).pipe(
                Effect.catchNoSuchElement,
                Effect.orDie,
                Effect.flatMap(
                    Option.match({
                        onNone: () => Effect.fail(new HttpApiError.NotFound()),
                        onSome: Effect.succeed,
                    })
                )
            );

        const applyUpdate = (
            account: Account,
            changes: Partial<{
                readonly scopes: ReadonlySet<string>;
                readonly revoked: boolean;
                readonly rateLimitLimit: number;
                readonly rateLimitWindow: Duration.Duration;
            }>
        ) =>
            Account.update
                .makeEffect({
                    key: account.key,
                    description: account.description,
                    ownerSub: account.ownerSub,
                    lastUsedAt: Model.Override(account.lastUsedAt),
                    scopes: changes.scopes ?? account.scopes,
                    revoked: changes.revoked ?? account.revoked,
                    rateLimitLimit: changes.rateLimitLimit ?? account.rateLimitLimit,
                    rateLimitWindow: changes.rateLimitWindow ?? account.rateLimitWindow,
                })
                .pipe(Effect.flatMap(repo.update), Effect.orDie);

        return handlers
            .handle("listKeys", () => repo.listAll().pipe(Effect.orDie))
            .handle("scopes", ({ params, payload }) =>
                Effect.flatMap(findAccount(params.key), (account) =>
                    applyUpdate(account, { scopes: new Set(payload.scopes) })
                )
            )
            .handle("rateLimit", ({ params, payload }) =>
                Effect.flatMap(findAccount(params.key), (account) =>
                    applyUpdate(account, { rateLimitLimit: payload.limit, rateLimitWindow: payload.window })
                )
            )
            .handle("revoke", ({ params }) =>
                Effect.flatMap(findAccount(params.key), (account) => applyUpdate(account, { revoked: true }))
            )
            .handle("enable", ({ params }) =>
                Effect.flatMap(findAccount(params.key), (account) => applyUpdate(account, { revoked: false }))
            )
            .handle("deleteKey", ({ params }) =>
                Effect.flatMap(findAccount(params.key), (account) =>
                    repo.delete(account.key).pipe(Effect.orDie, Effect.asVoid)
                )
            );
    })
);

/**
 * @since 1.0.0
 * @category Api
 */
export const SelfServiceApiLive = HttpApiBuilder.layer(SelfServiceApi).pipe(
    Layer.provide(SelfServiceGroupLive),
    Layer.provide(AdminGroupLive),
    Layer.provide(SessionCookieLive),
    Layer.provide(AdminSessionCookieLive)
);

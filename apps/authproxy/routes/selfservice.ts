import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { HttpEffect, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import { CookiePolicy, maybeCurrentSession } from "../cookies.ts";
import { ApiKey, Repository } from "../domain/model.ts";
import { SCOPE_CATALOG, SELF_SERVE_SCOPE_NAMES } from "../domain/scopes.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { AdminSessionCookie, CurrentSession, SelfServiceApi, SessionCookie } from "../shared/api.ts";
import { DEFAULT_RATE_LIMIT, MAX_KEYS_PER_USER } from "../shared/policy.ts";

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

const ScopesGroupLive = HttpApiBuilder.group(SelfServiceApi, "ScopesGroup", (handlers) =>
    handlers.handle("catalog", () => Effect.succeed(SCOPE_CATALOG))
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

                    // Only the self-serve scopes may be self-served, and an
                    // empty key would be useless.
                    const scopes = new Set(payload.scopes);
                    const allowed =
                        scopes.size > 0 && payload.scopes.every((scope) => SELF_SERVE_SCOPE_NAMES.has(scope));
                    if (!allowed) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const { count } = yield* repo.countForOwner(session.sub).pipe(Effect.orDie);
                    if (count >= MAX_KEYS_PER_USER) {
                        return yield* new HttpApiError.BadRequest();
                    }

                    const newApiKey = yield* ApiKey.insert
                        .makeEffect({
                            scopes,
                            description: payload.description,
                            ownerSub: Option.some(session.sub),
                            rateLimitLimit: DEFAULT_RATE_LIMIT.limit,
                            rateLimitWindow: Duration.millis(DEFAULT_RATE_LIMIT.windowMillis),
                        })
                        .pipe(Effect.orDie);

                    return yield* repo.insert(newApiKey).pipe(Effect.orDie);
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
                // The early exits return never-typed values; the normal path runs to the end.
                // oxlint-disable-next-line typescript/consistent-return
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

        const findApiKey = (key: string) =>
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
            apiKey: ApiKey,
            changes: Partial<{
                readonly scopes: ReadonlySet<string>;
                readonly revoked: boolean;
                readonly rateLimitLimit: number;
                readonly rateLimitWindow: Duration.Duration;
            }>
        ) =>
            ApiKey.update
                .makeEffect({
                    key: apiKey.key,
                    description: apiKey.description,
                    ownerSub: apiKey.ownerSub,
                    lastUsedAt: Model.Override(apiKey.lastUsedAt),
                    scopes: changes.scopes ?? apiKey.scopes,
                    revoked: changes.revoked ?? apiKey.revoked,
                    rateLimitLimit: changes.rateLimitLimit ?? apiKey.rateLimitLimit,
                    rateLimitWindow: changes.rateLimitWindow ?? apiKey.rateLimitWindow,
                })
                .pipe(Effect.flatMap(repo.update), Effect.orDie);

        return handlers
            .handle("listKeys", () => repo.listAll().pipe(Effect.orDie))
            .handle("scopes", ({ params, payload }) =>
                Effect.flatMap(findApiKey(params.key), (apiKey) =>
                    applyUpdate(apiKey, { scopes: new Set(payload.scopes) })
                )
            )
            .handle("rateLimit", ({ params, payload }) =>
                Effect.flatMap(findApiKey(params.key), (apiKey) =>
                    applyUpdate(apiKey, { rateLimitLimit: payload.limit, rateLimitWindow: payload.window })
                )
            )
            .handle("revoke", ({ params }) =>
                Effect.flatMap(findApiKey(params.key), (apiKey) => applyUpdate(apiKey, { revoked: true }))
            )
            .handle("enable", ({ params }) =>
                Effect.flatMap(findApiKey(params.key), (apiKey) => applyUpdate(apiKey, { revoked: false }))
            )
            .handle("deleteKey", ({ params }) =>
                Effect.flatMap(findApiKey(params.key), (apiKey) =>
                    repo.delete(apiKey.key).pipe(Effect.orDie, Effect.asVoid)
                )
            );
    })
);

/**
 * @since 1.0.0
 * @category Api
 */
export const SelfServiceApiLive = HttpApiBuilder.layer(SelfServiceApi).pipe(
    Layer.provide(ScopesGroupLive),
    Layer.provide(SelfServiceGroupLive),
    Layer.provide(AdminGroupLive),
    Layer.provide(SessionCookieLive),
    Layer.provide(AdminSessionCookieLive)
);

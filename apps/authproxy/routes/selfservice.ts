import { Config, DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";
import { HttpEffect, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { RateLimiter } from "effect/unstable/persistence";
import { Model } from "effect/unstable/schema";

import * as crypto from "node:crypto";

import { CookiePolicy, maybeCurrentSession } from "../cookies.ts";
import { sha256 } from "../crypto.ts";
import { Account, Repository } from "../domain/model.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { AdminSessionCookie, CurrentSession, SelfServiceApi, SessionCookie } from "../shared/api.ts";
import { DEFAULT_RATE_LIMIT, MAX_KEYS_PER_USER, SELF_SERVE_SCOPE_PATHS } from "../shared/scopes.ts";
import { TinyburgLookup } from "../tinyburg.ts";

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
        const sessions = yield* SessionsRepository;
        const lookup = yield* TinyburgLookup;
        const rateLimiter = yield* RateLimiter.make;

        const adminPassword = yield* Config.redacted("ADMIN_PASSWORD");
        const adminPlayerIds = yield* Config.string("ADMIN_PLAYER_IDS").pipe(
            Config.withDefault(""),
            Config.map(
                (raw) =>
                    new Set(
                        raw
                            .split(",")
                            .map((playerId) => playerId.trim())
                            .filter((playerId) => playerId !== "")
                    )
            )
        );

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
            )
            .handle("elevate", ({ payload }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;

                    // The endpoint is a password oracle, so attempts are
                    // strictly rate limited per session.
                    yield* rateLimiter
                        .consume({
                            onExceeded: "fail",
                            algorithm: "fixed-window",
                            key: `elevate:${session.id}`,
                            limit: 5,
                            window: Duration.minutes(5),
                        })
                        .pipe(Effect.mapError(() => new HttpApiError.Forbidden()));

                    // Hash both sides before comparing: equal lengths for the
                    // timing-safe comparison, and no length leak.
                    const presented = yield* sha256(payload.password);
                    const expected = yield* sha256(Redacted.value(adminPassword));
                    const passwordOk = crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected));

                    // Eligibility is evaluated live: which towers does this
                    // sub have linked at tinyburg.app right now. A lookup
                    // failure reads as not eligible, never as a pass.
                    const linked = yield* lookup.linkedPlayerIds(session.sub).pipe(
                        Effect.map(Option.some),
                        Effect.catch(() => Effect.succeed(Option.none<ReadonlySet<string>>()))
                    );
                    const eligible = Option.match(linked, {
                        onNone: () => false,
                        onSome: (playerIds) =>
                            adminPlayerIds.size > 0 &&
                            Array.from(adminPlayerIds).some((playerId) => playerIds.has(playerId)),
                    });

                    // One uniform refusal: which factor failed stays private.
                    if (!passwordOk || !eligible) {
                        return yield* new HttpApiError.Forbidden();
                    }

                    const elevated = yield* sessions.elevate(session.id).pipe(Effect.orDie);
                    return yield* Option.match(elevated, {
                        onNone: () => new HttpApiError.Forbidden(),
                        onSome: Effect.succeed,
                    });
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

import type { SqlError } from "effect/unstable/sql";

import { Effect, Option, Layer, Redacted, Array, DateTime, Duration, type Schema } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiMiddleware, HttpApiSecurity, HttpApiError } from "effect/unstable/httpapi";
import { RateLimiter } from "effect/unstable/persistence";

import { type CurrentAccount, Repository, Account } from "../domain/model.ts";

export class Authorization extends HttpApiMiddleware.Service<
    Authorization,
    {
        // Written out to mirror the neighbouring signatures.
        // oxlint-disable-next-line typescript/no-redundant-type-constituents
        provides: CurrentAccount & never;
    }
>()("Authorization", {
    error: [HttpApiError.Unauthorized, HttpApiError.Forbidden, HttpApiError.InternalServerError],
    security: {
        bearer: HttpApiSecurity.bearer,
    },
}) {}

export const AuthorizationLive = Layer.effect(
    Authorization,
    Effect.gen(function* () {
        const repo = yield* Repository;
        const rateLimiter = yield* RateLimiter.make;

        const unauthenticatedLimit = 3;
        const unauthenticatedWindow = Duration.minutes(1);

        const seededNoneAccountKeyEffect = repo.seededNoneAccount.pipe(
            Effect.map((account) => account.key),
            Effect.catchNoSuchElement,
            Effect.map(Option.getOrUndefined)
        );

        const seededReadonlyAccountKeyEffect = repo.seededReadonlyAccount.pipe(
            Effect.map((account) => account.key),
            Effect.catchNoSuchElement,
            Effect.map(Option.getOrUndefined)
        );

        const catch429s = <A, E, R>(
            effect: Effect.Effect<A, E | RateLimiter.RateLimiterError, R>
        ): Effect.Effect<A | HttpServerResponse.HttpServerResponse, E | HttpApiError.InternalServerError, R> =>
            Effect.catchReason(
                effect,
                "RateLimiterError",
                "RateLimitExceeded",
                (rateLimitExceeded) =>
                    HttpServerResponse.raw("", {
                        status: 429,
                        contentLength: 0,
                        statusText: "Too Many Requests",
                        headers: {
                            "X-RateLimit-Limit": rateLimitExceeded.limit.toString(),
                            "X-RateLimit-Remaining": rateLimitExceeded.remaining.toString(),
                            "X-RateLimit-Reset": Duration.toSeconds(rateLimitExceeded.retryAfter).toString(),
                        },
                    }).pipe(Effect.succeed),
                () => new HttpApiError.InternalServerError()
            );

        const catch500s = <A, E, R>(effect: Effect.Effect<A, E | SqlError.SqlError | Schema.SchemaError, R>) =>
            effect.pipe(
                Effect.catchTag("SqlError", () => new HttpApiError.InternalServerError()),
                Effect.catchTag("SchemaError", () => new HttpApiError.InternalServerError())
            );

        return {
            bearer: Effect.fnUntraced(
                function* (next, { credential, endpoint }) {
                    const bearerToken = Redacted.value(credential);
                    const request = yield* HttpServerRequest.HttpServerRequest;
                    const maybeAccount = yield* repo.findById(bearerToken).pipe(Effect.catchNoSuchElement);

                    const headers = request.headers;
                    const doConnectingIp = Headers.get(headers, "do-connecting-ip");

                    const seededNoneAccountKey = yield* seededNoneAccountKeyEffect;
                    const seededReadonlyAccountKey = yield* seededReadonlyAccountKeyEffect;

                    yield* rateLimiter.consume({
                        onExceeded: "fail",
                        algorithm: "fixed-window",
                        key: maybeAccount.pipe(
                            Option.map((account) => account.key),
                            Option.filter((key) => key !== seededNoneAccountKey),
                            Option.filter((key) => key !== seededReadonlyAccountKey),
                            Option.orElse(() => doConnectingIp),
                            Option.getOrElse(() => "unknown")
                        ),
                        limit: maybeAccount.pipe(
                            Option.map((account) => account.rateLimitLimit),
                            Option.getOrElse(() => unauthenticatedLimit)
                        ),
                        window: maybeAccount.pipe(
                            Option.map((account) => account.rateLimitWindow),
                            Option.getOrElse(() => unauthenticatedWindow)
                        ),
                    });

                    const isAuthenticated = Option.isSome(maybeAccount);
                    const isAuthorized =
                        isAuthenticated &&
                        Array.some(Array.fromIterable(maybeAccount.value.scopes), (scope) =>
                            endpoint.path.startsWith(scope)
                        ) &&
                        !maybeAccount.value.revoked;

                    if (!isAuthenticated) return yield* new HttpApiError.Unauthorized();
                    else if (!isAuthorized) return yield* new HttpApiError.Forbidden();

                    const now = yield* DateTime.now;
                    const accountLastUsedAt = maybeAccount.value.lastUsedAt;

                    if (
                        Duration.isGreaterThanOrEqualTo(DateTime.distance(accountLastUsedAt, now), Duration.minutes(1))
                    ) {
                        const updatedAccount = yield* Account.update.makeEffect({
                            key: maybeAccount.value.key,
                            scopes: maybeAccount.value.scopes,
                            revoked: maybeAccount.value.revoked,
                            description: maybeAccount.value.description,
                            ownerSub: maybeAccount.value.ownerSub,
                            rateLimitLimit: maybeAccount.value.rateLimitLimit,
                            rateLimitWindow: maybeAccount.value.rateLimitWindow,
                        });

                        yield* repo.updateVoid(updatedAccount);
                    }

                    return yield* next;
                },
                catch500s,
                catch429s
            ),
        };
    })
);

import { RateLimiter } from "@effect/experimental";
import {
    Headers,
    HttpApiError,
    HttpLayerRouter,
    HttpMiddleware,
    HttpServerRequest,
    HttpServerResponse,
} from "@effect/platform";
import { Duration, Effect, Option, Schema } from "effect";

import { CurrentAccount, Repository } from "../domain/model.ts";

/**
 * Middleware that applies rate limiting based on the current account's rate
 * limit settings.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const AuthProxyApiRatelimitMiddleware = HttpLayerRouter.middleware(
    Effect.gen(function* () {
        const withRateLimiter = yield* RateLimiter.makeWithRateLimiter;

        const catchTo500 = <A, E, R>(
            effect: Effect.Effect<A, E | RateLimiter.RateLimitStoreError, R>
        ): Effect.Effect<A, E | HttpApiError.InternalServerError, R> =>
            Effect.catchIf(
                effect,
                Schema.is(RateLimiter.RateLimitStoreError),
                () => new HttpApiError.InternalServerError()
            );

        const catchTo429 = <A, E, R>(
            effect: Effect.Effect<A, E | RateLimiter.RateLimitExceeded, R>
        ): Effect.Effect<A | HttpServerResponse.HttpServerResponse, E, R> =>
            Effect.catchIf(
                effect,
                Schema.is(RateLimiter.RateLimitExceeded),
                (rateLimitExceeded: RateLimiter.RateLimitExceeded) =>
                    HttpServerResponse.raw("", {
                        status: 429,
                        contentLength: 0,
                        statusText: "Too Many Requests",
                        headers: {
                            "X-RateLimit-Limit": rateLimitExceeded.limit.toString(),
                            "X-RateLimit-Remaining": rateLimitExceeded.remaining.toString(),
                            "X-RateLimit-Reset": Duration.toSeconds(rateLimitExceeded.retryAfter).toString(),
                        },
                    })
            );

        const unauthenticatedLimit = 3;
        const unauthenticatedWindow = Duration.minutes(1);

        const seededNoneAccountKey = yield* Effect.map(Repository.seededNoneAccount, ({ key }) => key);
        const seededReadonlyAccountKey = yield* Effect.map(Repository.seededReadonlyAccount, ({ key }) => key);

        return HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const maybeAccount = yield* Effect.serviceOption(CurrentAccount);

                const headers = request.headers;
                const doConnectingIp = Headers.get(headers, "do-connecting-ip");

                return yield* withRateLimiter({
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
                })(httpAppMiddleware).pipe(catchTo429, catchTo500);
            })
        );
    })
);

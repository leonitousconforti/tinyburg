import { HttpApiError, HttpLayerRouter, HttpMiddleware, HttpServerRequest } from "@effect/platform";
import { Array, DateTime, Duration, Effect, Option } from "effect";

import { CurrentAccount, Repository } from "../domain/model.ts";

/**
 * Middleware that checks if the current account is authorized to access the
 * requested resource.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const AuthProxyApiAuthorizationMiddleware = HttpLayerRouter.middleware(
    Effect.map(Repository, (repo) =>
        HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const account = yield* Effect.serviceOption(CurrentAccount);

                const isAuthenticated = Option.isSome(account);
                const isAuthorized =
                    isAuthenticated &&
                    Array.some(account.value.scopes, (scope) => request.url.startsWith(scope)) &&
                    !account.value.revoked;

                if (!isAuthenticated) return yield* new HttpApiError.Unauthorized();
                else if (!isAuthorized) return yield* new HttpApiError.Forbidden();

                const now = yield* DateTime.now;
                const accountLastUsedAt = account.value.lastUsedAt;

                if (
                    Duration.greaterThanOrEqualTo(
                        DateTime.distanceDuration(accountLastUsedAt, now),
                        Duration.minutes(1)
                    )
                ) {
                    yield* repo.updateVoid({
                        ...account.value,
                        lastUsedAt: undefined,
                    });
                }

                return yield* httpAppMiddleware;
            })
        )
    )
);

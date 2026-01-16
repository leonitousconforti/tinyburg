import { Headers, HttpLayerRouter, HttpMiddleware, HttpServerRequest } from "@effect/platform";
import { Effect, Function, Option, Schema, String } from "effect";

import { CurrentAccount, Repository } from "../domain/model.ts";

/**
 * Middleware that extracts the current account from the Authorization header
 * and provides it in the context if there is a valid account.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const AuthProxyApiAccountMiddleware = HttpLayerRouter.middleware<{ provides: CurrentAccount & never }>()(
    Effect.map(Repository, (repo) =>
        HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const bearerToken = Function.pipe(
                    request.headers,
                    Headers.get("authorization"),
                    Option.map(String.slice("Bearer ".length)),
                    Option.getOrUndefined
                );

                if (bearerToken === undefined || !Schema.is(Schema.UUID)(bearerToken)) {
                    return yield* httpAppMiddleware;
                }

                const maybeAccount = yield* repo.findById(bearerToken);
                if (Option.isNone(maybeAccount)) return yield* httpAppMiddleware;
                else return yield* Effect.provideService(httpAppMiddleware, CurrentAccount, maybeAccount.value);
            })
        )
    )
);

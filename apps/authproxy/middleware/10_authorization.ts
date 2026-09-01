import { Context, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiError, HttpApiMiddleware, HttpApiSecurity } from "effect/unstable/httpapi";
import { RateLimiter } from "effect/unstable/persistence";
import { SqlError } from "effect/unstable/sql";

import { ResourceServer } from "effect-oidc";

import { ApiKey, type CurrentApiKey, Repository } from "../domain/model.ts";

export class Authorization extends HttpApiMiddleware.Service<
    Authorization,
    {
        // Written out to mirror the neighboring signatures.
        // oxlint-disable-next-line typescript/no-redundant-type-constituents
        provides: CurrentApiKey & never;
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

        const seededNoneApiKeyEffect = repo.seededNoneApiKey.pipe(
            Effect.map((apiKey) => apiKey.key),
            Effect.catchNoSuchElement,
            Effect.map(Option.getOrUndefined)
        );

        const seededReadonlyApiKeyEffect = repo.seededReadonlyApiKey.pipe(
            Effect.map((apiKey) => apiKey.key),
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
                Effect.catchIf(Schema.isSchemaError, () => new HttpApiError.InternalServerError()),
                Effect.catchIf(SqlError.isSqlError, () => new HttpApiError.InternalServerError())
            );

        return {
            bearer: Effect.fnUntraced(
                function* (next, { credential, endpoint }) {
                    const bearerToken = Redacted.value(credential);
                    const request = yield* HttpServerRequest.HttpServerRequest;
                    const maybeApiKey = yield* repo.findById(bearerToken).pipe(Effect.catchNoSuchElement);

                    const headers = request.headers;
                    const doConnectingIp = Headers.get(headers, "do-connecting-ip");

                    const seededNoneApiKey = yield* seededNoneApiKeyEffect;
                    const seededReadonlyApiKey = yield* seededReadonlyApiKeyEffect;

                    yield* rateLimiter.consume({
                        onExceeded: "fail",
                        algorithm: "fixed-window",
                        key: maybeApiKey.pipe(
                            Option.map((apiKey) => apiKey.key),
                            Option.filter((key) => key !== seededNoneApiKey),
                            Option.filter((key) => key !== seededReadonlyApiKey),
                            Option.orElse(() => doConnectingIp),
                            Option.getOrElse(() => "unknown")
                        ),
                        limit: maybeApiKey.pipe(
                            Option.map((apiKey) => apiKey.rateLimitLimit),
                            Option.getOrElse(() => unauthenticatedLimit)
                        ),
                        window: maybeApiKey.pipe(
                            Option.map((apiKey) => apiKey.rateLimitWindow),
                            Option.getOrElse(() => unauthenticatedWindow)
                        ),
                    });

                    // The scopes that unlock this endpoint are read off the
                    // endpoint itself: the `OIDCScopes` annotation stamped on
                    // it in `@tinyburg/tinytower-sdk`. A key needs one of them,
                    // by name, exactly. An endpoint carrying none is one no key
                    // may call through the proxy, whatever it holds.
                    const accepted = Context.getOption(endpoint.annotations, ResourceServer.OIDCScopes).pipe(
                        Option.map((scopes) => scopes.map(ResourceServer.scopeName)),
                        Option.getOrElse((): ReadonlyArray<string> => [])
                    );
                    const isAuthenticated = Option.isSome(maybeApiKey);
                    const isAuthorized =
                        isAuthenticated &&
                        accepted.some((scope) => maybeApiKey.value.scopes.has(scope)) &&
                        !maybeApiKey.value.revoked;

                    if (!isAuthenticated) return yield* new HttpApiError.Unauthorized();
                    else if (!isAuthorized) return yield* new HttpApiError.Forbidden();

                    const now = yield* DateTime.now;
                    const apiKeyLastUsedAt = maybeApiKey.value.lastUsedAt;

                    if (
                        Duration.isGreaterThanOrEqualTo(DateTime.distance(apiKeyLastUsedAt, now), Duration.minutes(1))
                    ) {
                        const updatedApiKey = yield* ApiKey.update
                            .makeEffect({
                                key: maybeApiKey.value.key,
                                scopes: maybeApiKey.value.scopes,
                                revoked: maybeApiKey.value.revoked,
                                description: maybeApiKey.value.description,
                                ownerSub: maybeApiKey.value.ownerSub,
                                rateLimitLimit: maybeApiKey.value.rateLimitLimit,
                                rateLimitWindow: maybeApiKey.value.rateLimitWindow,
                            })
                            .pipe(Effect.mapError((issue) => new Schema.SchemaError(issue)));

                        yield* repo.updateVoid(updatedApiKey);
                    }

                    return yield* next;
                },
                catch500s,
                catch429s
            ),
        };
    })
);

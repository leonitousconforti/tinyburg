import { HttpApiError, HttpLayerRouter, HttpMiddleware, HttpRouter, HttpServerRequest } from "@effect/platform";
import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { Effect, Option, Schema, String } from "effect";

/**
 * Middleware that decodes a Base64Url-encoded hash from the URL and signs it
 * using NimblebitAuth, adding the signed hash to the route parameters.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const AuthProxyApiDecodeHashMiddleware = HttpLayerRouter.middleware(
    Effect.map(NimblebitAuth.NimblebitAuth, (auth) =>
        HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const lastSlashIndex = String.lastIndexOf("/")(request.url);
                if (Option.isNone(lastSlashIndex)) return yield* new HttpApiError.BadRequest();

                const encodedHash = request.url.substring(lastSlashIndex.value + 1);
                const decodedHash = Schema.decodeOption(Schema.StringFromBase64Url)(encodedHash);
                if (Option.isNone(decodedHash)) return yield* new HttpApiError.BadRequest();

                const signedHash = yield* auth
                    .sign(decodedHash.value)
                    .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

                return yield* Effect.updateService(
                    httpAppMiddleware,
                    HttpRouter.RouteContext,
                    (previousRouteContext) => ({
                        ...previousRouteContext,
                        params: { ...previousRouteContext.params, hash: signedHash },
                    })
                );
            })
        )
    )
);

import { Effect, Layer, Option, Schema, String } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/unstable/http";
import { HttpApiError, HttpApiMiddleware } from "effect/unstable/httpapi";

import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";

/**
 * Middleware that decodes a Base64Url-encoded hash from the URL and signs it
 * using NimblebitAuth, adding the signed hash to the route parameters.
 *
 * @since 1.0.0
 * @category Middleware
 */
export class AuthProxyApiDecodeHash extends HttpApiMiddleware.Service<AuthProxyApiDecodeHash, {}>()(
    "AuthProxyApiDecodeHash",
    { error: [HttpApiError.BadRequest, HttpApiError.InternalServerError] }
) {}

/**
 * Middleware that decodes a Base64Url-encoded hash from the URL and signs it
 * using NimblebitAuth, adding the signed hash to the route parameters.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const AuthProxyApiDecodeHashLive = Layer.effect(
    AuthProxyApiDecodeHash,
    Effect.gen(function* () {
        const nimblebitAuth = yield* NimblebitAuth.NimblebitAuth;

        return Effect.fnUntraced(function* (httpEffect, _options) {
            const request = yield* HttpServerRequest.HttpServerRequest;
            if (request.url.startsWith("/verify_device/")) return yield* httpEffect;

            const lastSlashIndex = String.lastIndexOf("/")(request.url);
            if (Option.isNone(lastSlashIndex)) return yield* new HttpApiError.BadRequest();

            const encodedHash = request.url.substring(lastSlashIndex.value + 1);
            const decodedHash = Schema.decodeOption(Schema.StringFromBase64Url)(encodedHash);
            if (Option.isNone(decodedHash)) return yield* new HttpApiError.BadRequest();

            const signedHash = yield* nimblebitAuth
                .sign(decodedHash.value)
                .pipe(Effect.mapError(() => new HttpApiError.InternalServerError()));

            return yield* Effect.updateService(httpEffect, HttpRouter.RouteContext, (previousRouteContext) => ({
                ...previousRouteContext,
                params: {
                    ...previousRouteContext.params,
                    hash: signedHash,
                },
            }));
        });
    })
);

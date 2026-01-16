import { Headers, HttpLayerRouter, HttpMiddleware, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect, Either, Encoding, Function, Option, Redacted, String } from "effect";

import * as Config from "effect/Config";
import * as Layer from "effect/Layer";
import { Account, Repository } from "../domain/model.ts";

/** @internal */
const AccountResponseJson = HttpServerResponse.schemaJson(Account.json);

/** @internal */
const BasicAuthMiddleware = (credentials: {
    username: string;
    password: Redacted.Redacted<string>;
    realm?: string | undefined;
}) =>
    HttpLayerRouter.middleware(
        HttpMiddleware.make((httpAppMiddleware) =>
            Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;

                const maybeAuth = Function.pipe(
                    request.headers,
                    Headers.get("authorization"),
                    Option.map(String.slice("Basic ".length)),
                    Option.map(Encoding.decodeBase64String),
                    Option.flatMap(Either.getRight),
                    Option.getOrUndefined
                );

                if (maybeAuth === undefined) {
                    const realm = credentials.realm ? ` realm="${credentials.realm}"` : "";
                    return HttpServerResponse.raw("", {
                        status: 401,
                        contentLength: 0,
                        statusText: "Unauthorized",
                        headers: { "WWW-Authenticate": `Basic${realm}` },
                    });
                }

                const authParts = String.split(maybeAuth, ":");

                if (
                    authParts.length !== 2 ||
                    authParts[0] !== credentials.username ||
                    authParts[1] !== Redacted.value(credentials.password)
                ) {
                    return HttpServerResponse.raw("", {
                        status: 403,
                        contentLength: 0,
                        statusText: "Forbidden",
                    });
                }

                return yield* httpAppMiddleware;
            })
        )
    );

/** @internal */
const DefaultAdminMiddleware = Layer.unwrapEffect(
    Effect.gen(function* () {
        const adminUsername = yield* Config.string("ADMIN_USERNAME");
        const adminPassword = yield* Config.redacted("ADMIN_PASSWORD");
        return BasicAuthMiddleware({
            username: adminUsername,
            password: adminPassword,
            realm: "Tinyburg AuthProxy Admin",
        }).layer;
    })
);

/**
 * Route to create a new read-only account. Requires basic authentication with
 * the admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const MakeAccountRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/new/readonly",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const newAccount = yield* repo.insert({
            createdAt: undefined,
            lastUsedAt: undefined,
            scopes: repo.seededReadonlyAccount.scopes,
            rateLimitLimit: repo.seededReadonlyAccount.rateLimitLimit,
            rateLimitWindow: repo.seededReadonlyAccount.rateLimitWindow,
        });

        return yield* AccountResponseJson(newAccount);
    })
).pipe(Layer.provide(DefaultAdminMiddleware));

/**
 * Route to view an account by its key. Requires basic authentication with the
 * admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const ViewAccountRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/view/:key",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const route = yield* HttpLayerRouter.RouteContext;

        const accountKey = route.params["key"] ?? "";
        const maybeAccount = yield* repo.findById(accountKey);

        if (Option.isNone(maybeAccount)) {
            return HttpServerResponse.raw("", {
                status: 404,
                contentLength: 0,
                statusText: "Not Found",
            });
        }

        return yield* AccountResponseJson(maybeAccount.value);
    })
).pipe(Layer.provide(DefaultAdminMiddleware));

/**
 * Route to revoke an account by its key. Requires basic authentication with the
 * admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const RevokeAccountRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/revoke/:key",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const route = yield* HttpLayerRouter.RouteContext;

        const accountKey = route.params["key"] ?? "";
        const maybeAccount = yield* repo.findById(accountKey);

        if (Option.isNone(maybeAccount)) {
            return HttpServerResponse.raw("", {
                status: 404,
                contentLength: 0,
                statusText: "Not Found",
            });
        }

        const account = maybeAccount.value;
        if (account.revoked) {
            return HttpServerResponse.raw("", {
                status: 400,
                contentLength: 0,
                statusText: "Bad Request",
            });
        }

        const revokedAccount = yield* repo.update({
            ...account,
            revoked: true,
            lastUsedAt: undefined,
        });

        return yield* AccountResponseJson(revokedAccount);
    })
).pipe(Layer.provide(DefaultAdminMiddleware));

/**
 * Route to authorize an account by its key. Requires basic authentication with
 * the admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const AuthorizeAccountRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/authorize/:key",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const route = yield* HttpLayerRouter.RouteContext;

        const accountKey = route.params["key"] ?? "";
        const maybeAccount = yield* repo.findById(accountKey);

        if (Option.isNone(maybeAccount)) {
            return HttpServerResponse.raw("", {
                status: 404,
                contentLength: 0,
                statusText: "Not Found",
            });
        }

        const account = maybeAccount.value;
        if (!account.revoked) {
            return HttpServerResponse.raw("", {
                status: 400,
                contentLength: 0,
                statusText: "Bad Request",
            });
        }

        const authorizedAccount = yield* repo.update({
            ...account,
            revoked: false,
            lastUsedAt: undefined,
        });

        return yield* AccountResponseJson(authorizedAccount);
    })
).pipe(Layer.provide(DefaultAdminMiddleware));

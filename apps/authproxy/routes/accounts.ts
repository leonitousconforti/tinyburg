import { VariantSchema } from "@effect/experimental";
import { Headers, HttpLayerRouter, HttpMiddleware, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Config, Effect, Either, Encoding, Function, Layer, Option, Redacted, Schema, String } from "effect";

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
 * Route to create a new none account. Requires basic authentication with the
 * admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const MakeNoneAccountRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/new/none",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const newAccount = yield* repo.insert({
            createdAt: undefined,
            lastUsedAt: undefined,
            scopes: repo.seededNoneAccount.scopes,
            rateLimitLimit: repo.seededNoneAccount.rateLimitLimit,
            rateLimitWindow: repo.seededNoneAccount.rateLimitWindow,
        });

        return yield* AccountResponseJson(newAccount);
    })
);

/**
 * Route to create a new read-only account. Requires basic authentication with
 * the admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const MakeReadonlyAccountRoute = HttpLayerRouter.add(
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
);

/**
 * Route to list all accounts. Requires basic authentication with the admin
 * username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const ListAccountsRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/list",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const accounts = yield* repo.listAll();
        return yield* HttpServerResponse.schemaJson(Schema.Array(Account.json))(accounts);
    })
);

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
);

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
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });

        return yield* AccountResponseJson(revokedAccount);
    })
);

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
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });

        return yield* AccountResponseJson(authorizedAccount);
    })
);

/**
 * Route to add a scope to an account by its key. Requires basic authentication
 * with the admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const AddScopeRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/add-scope/:key/:scope",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const route = yield* HttpLayerRouter.RouteContext;

        const accountKey = route.params["key"] ?? "";
        const scope = route.params["scope"] ?? "";
        const scopeDecoded = yield* Encoding.decodeBase64UrlString(scope);

        const maybeAccount = yield* repo.findById(accountKey);
        if (Option.isNone(maybeAccount)) {
            return HttpServerResponse.raw("", {
                status: 404,
                contentLength: 0,
                statusText: "Not Found",
            });
        }

        const account = maybeAccount.value;
        if (account.scopes.includes(scopeDecoded)) {
            return HttpServerResponse.raw("", {
                status: 400,
                contentLength: 0,
                statusText: "Bad Request",
            });
        }

        const updatedAccount = yield* repo.update({
            ...account,
            scopes: [...account.scopes, scopeDecoded],
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });

        return yield* AccountResponseJson(updatedAccount);
    })
);

/**
 * Route to remove a scope from an account by its key. Requires basic
 * authentication with the admin username and password.
 *
 * @since 1.0.0
 * @category Routes
 */
export const RemoveScopeRoute = HttpLayerRouter.add(
    "GET",
    "/accounts/remove-scope/:key/:scope",
    Effect.gen(function* () {
        const repo = yield* Repository;
        const route = yield* HttpLayerRouter.RouteContext;

        const accountKey = route.params["key"] ?? "";
        const scope = route.params["scope"] ?? "";
        const scopeToRemove = yield* Encoding.decodeBase64UrlString(scope);

        const maybeAccount = yield* repo.findById(accountKey);
        if (Option.isNone(maybeAccount)) {
            return HttpServerResponse.raw("", {
                status: 404,
                contentLength: 0,
                statusText: "Not Found",
            });
        }

        const account = maybeAccount.value;
        if (!account.scopes.includes(scopeToRemove)) {
            return HttpServerResponse.raw("", {
                status: 400,
                contentLength: 0,
                statusText: "Bad Request",
            });
        }

        const updatedAccount = yield* repo.update({
            ...account,
            scopes: account.scopes.filter((scope) => scope !== scopeToRemove),
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });

        return yield* AccountResponseJson(updatedAccount);
    })
);

/**
 * @since 1.0.0
 * @category Routes
 */
export const AllAccountsRoutes = Layer.mergeAll(
    MakeNoneAccountRoute,
    MakeReadonlyAccountRoute,
    ListAccountsRoute,
    ViewAccountRoute,
    RevokeAccountRoute,
    AuthorizeAccountRoute,
    AddScopeRoute,
    RemoveScopeRoute
).pipe(Layer.provide(DefaultAdminMiddleware));

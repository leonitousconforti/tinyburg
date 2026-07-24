import { Config, Effect, Layer, Option, Redacted, Schema, Function } from "effect";
import {
    HttpApi,
    HttpApiBuilder,
    HttpApiEndpoint,
    HttpApiError,
    HttpApiGroup,
    HttpApiMiddleware,
    HttpApiSecurity,
} from "effect/unstable/httpapi";
import { Model } from "effect/unstable/schema";

import * as crypto from "node:crypto";

import { Account, Repository } from "../domain/model.ts";

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const CreateAccount = HttpApiEndpoint.post("create", `/accounts/new/:accountType`, {
    params: { accountType: Schema.Literals(["none", "readonly"]) },
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DeleteAccount = HttpApiEndpoint.delete("delete", `/accounts/delete/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    error: HttpApiError.NotFound,
    success: Schema.Void,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ViewAccount = HttpApiEndpoint.get("view", `/accounts/view/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    error: HttpApiError.NotFound,
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ListAccounts = HttpApiEndpoint.get("list", `/accounts/list`, {
    success: Schema.Array(Account.json),
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const RevokeAccount = HttpApiEndpoint.put("revoke", `/accounts/revoke/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    error: [HttpApiError.NotFound, HttpApiError.BadRequest],
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const AuthorizeAccount = HttpApiEndpoint.put("authorize", `/accounts/grant/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    error: [HttpApiError.NotFound, HttpApiError.BadRequest],
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyScopes = HttpApiEndpoint.patch("scopes", `/accounts/scopes/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    payload: Schema.Struct({ scopes: Schema.ReadonlySet(Schema.String) }),
    error: HttpApiError.NotFound,
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyRateLimit = HttpApiEndpoint.patch("rateLimit", `/accounts/ratelimit/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    payload: Schema.Struct({ limit: Schema.Int, window: Schema.DurationFromMillis }),
    error: HttpApiError.NotFound,
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyDescription = HttpApiEndpoint.patch("description", `/accounts/description/:key`, {
    params: { key: Schema.String.check(Schema.isUUID()) },
    payload: Schema.Struct({ description: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }) }),
    error: HttpApiError.NotFound,
    success: Account.json,
});

/**
 * @since 1.0.0
 * @category Groups
 */
export const AccountsGroup = HttpApiGroup.make("AccountsGroup")
    .add(CreateAccount)
    .add(DeleteAccount)
    .add(ViewAccount)
    .add(ListAccounts)
    .add(RevokeAccount)
    .add(AuthorizeAccount)
    .add(ModifyScopes)
    .add(ModifyRateLimit)
    .add(ModifyDescription);

/**
 * @since 1.0.0
 * @category Middlewares
 */
export class Authorization extends HttpApiMiddleware.Service<Authorization>()("Authorization", {
    error: HttpApiError.Unauthorized,
    security: { basic: HttpApiSecurity.basic },
}) {}

/**
 * @since 1.0.0
 * @category Api
 */
export const AccountsApi = HttpApi.make("AccountsApi").add(AccountsGroup).middleware(Authorization);

/** @internal */
const CreateHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "create",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { accountType } }) {
    const repo = yield* Repository;
    const seededAccount = yield* accountType === "none" ? repo.seededNoneAccount : repo.seededReadonlyAccount;
    const newAccount = yield* Account.insert.makeEffect({
        rateLimitWindow: seededAccount.rateLimitWindow,
        rateLimitLimit: seededAccount.rateLimitLimit,
        scopes: seededAccount.scopes,
        description: Option.none(),
    });
    return yield* repo.insert(newAccount);
}, Effect.orDie);

/** @internal */
const DeleteHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "delete",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);
    return yield* Option.match(maybeAccount, {
        onNone: () => Effect.fail(new HttpApiError.NotFound()),
        onSome: (account) => repo.delete(account.key),
    });
}, Effect.orDie);

/** @internal */
const ViewHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "view",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);
    return yield* Option.match(maybeAccount, {
        onNone: () => Effect.fail(new HttpApiError.NotFound()),
        onSome: Effect.succeed,
    });
}, Effect.orDie);

/** @internal */
const ListHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "list",
    never,
    Repository
> = Effect.fnUntraced(function* () {
    const repo = yield* Repository;
    return yield* repo.listAll();
}, Effect.orDie);

/** @internal */
const RevokeHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "revoke",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);

    if (Option.isNone(maybeAccount)) {
        return yield* new HttpApiError.NotFound();
    }

    const account = maybeAccount.value;
    if (account.revoked) {
        return yield* new HttpApiError.BadRequest();
    }

    const updatedAccount = yield* Account.update.makeEffect({
        key: maybeAccount.value.key,
        scopes: maybeAccount.value.scopes,
        description: maybeAccount.value.description,
        rateLimitLimit: maybeAccount.value.rateLimitLimit,
        rateLimitWindow: maybeAccount.value.rateLimitWindow,
        lastUsedAt: Model.Override(maybeAccount.value.lastUsedAt),
        revoked: true,
    });

    return yield* repo.update(updatedAccount);
}, Effect.orDie);

/** @internal */
const AuthorizeHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "authorize",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);

    if (Option.isNone(maybeAccount)) {
        return yield* new HttpApiError.NotFound();
    }

    const account = maybeAccount.value;
    if (!account.revoked) {
        return yield* new HttpApiError.BadRequest();
    }

    const updatedAccount = yield* Account.update.makeEffect({
        key: maybeAccount.value.key,
        scopes: maybeAccount.value.scopes,
        description: maybeAccount.value.description,
        rateLimitLimit: maybeAccount.value.rateLimitLimit,
        rateLimitWindow: maybeAccount.value.rateLimitWindow,
        lastUsedAt: Model.Override(maybeAccount.value.lastUsedAt),
        revoked: false,
    });

    return yield* repo.update(updatedAccount);
}, Effect.orDie);

/** @internal */
const ModifyScopesHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "scopes",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key }, payload: { scopes } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);

    if (Option.isNone(maybeAccount)) {
        return yield* new HttpApiError.NotFound();
    }

    const updatedAccount = yield* Account.update.makeEffect({
        key: maybeAccount.value.key,
        revoked: maybeAccount.value.revoked,
        description: maybeAccount.value.description,
        rateLimitLimit: maybeAccount.value.rateLimitLimit,
        rateLimitWindow: maybeAccount.value.rateLimitWindow,
        lastUsedAt: Model.Override(maybeAccount.value.lastUsedAt),
        scopes,
    });

    return yield* repo.update(updatedAccount);
}, Effect.orDie);

/** @internal */
const ModifyRateLimitHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "rateLimit",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key }, payload: { limit, window } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);

    if (Option.isNone(maybeAccount)) {
        return yield* new HttpApiError.NotFound();
    }

    const updatedAccount = yield* Account.update.makeEffect({
        key: maybeAccount.value.key,
        revoked: maybeAccount.value.revoked,
        description: maybeAccount.value.description,
        scopes: maybeAccount.value.scopes,
        lastUsedAt: Model.Override(maybeAccount.value.lastUsedAt),
        rateLimitLimit: limit,
        rateLimitWindow: window,
    });

    return yield* repo.update(updatedAccount);
}, Effect.orDie);

/** @internal */
const ModifyDescriptionHandler: HttpApiEndpoint.HandlerWithIdentifier<
    HttpApiGroup.EndpointsWithIdentifier<
        (typeof AccountsApi)["groups"][keyof (typeof AccountsApi)["groups"]],
        "AccountsGroup"
    >,
    "description",
    never,
    Repository
> = Effect.fnUntraced(function* ({ params: { key }, payload: { description } }) {
    const repo = yield* Repository;
    const maybeAccount = yield* repo.findById(key).pipe(Effect.catchNoSuchElement);

    if (Option.isNone(maybeAccount)) {
        return yield* new HttpApiError.NotFound();
    }

    const updatedAccount = yield* Account.update.makeEffect({
        key: maybeAccount.value.key,
        revoked: maybeAccount.value.revoked,
        scopes: maybeAccount.value.scopes,
        rateLimitLimit: maybeAccount.value.rateLimitLimit,
        rateLimitWindow: maybeAccount.value.rateLimitWindow,
        lastUsedAt: Model.Override(maybeAccount.value.lastUsedAt),
        description,
    });

    return yield* repo.update(updatedAccount);
}, Effect.orDie);

/** @internal */
const AccountsGroupLive = HttpApiBuilder.group(
    AccountsApi,
    "AccountsGroup",
    Effect.fnUntraced(function* (handlers) {
        const repo = yield* Repository;
        const provideRepo = Effect.provideService(Repository, repo);

        return handlers
            .handle("create", Function.flow(CreateHandler, provideRepo))
            .handle("delete", Function.flow(DeleteHandler, provideRepo))
            .handle("view", Function.flow(ViewHandler, provideRepo))
            .handle("list", Function.flow(ListHandler, provideRepo))
            .handle("revoke", Function.flow(RevokeHandler, provideRepo))
            .handle("authorize", Function.flow(AuthorizeHandler, provideRepo))
            .handle("scopes", Function.flow(ModifyScopesHandler, provideRepo))
            .handle("rateLimit", Function.flow(ModifyRateLimitHandler, provideRepo))
            .handle("description", Function.flow(ModifyDescriptionHandler, provideRepo));
    })
);

/** @internal */
const AuthorizationLive = Layer.effect(
    Authorization,
    Effect.gen(function* () {
        const adminUsername = yield* Config.redacted("ADMIN_USERNAME");
        const adminPassword = yield* Config.redacted("ADMIN_PASSWORD");

        return {
            basic: (effect, { credential }) => {
                if (
                    !crypto.timingSafeEqual(
                        Buffer.from(credential.username),
                        Buffer.from(Redacted.value(adminUsername))
                    ) ||
                    !crypto.timingSafeEqual(
                        Buffer.from(Redacted.value(credential.password)),
                        Buffer.from(Redacted.value(adminPassword))
                    )
                ) {
                    return Effect.fail(new HttpApiError.Unauthorized());
                }

                return effect;
            },
        };
    })
);

/**
 * @since 1.0.0
 * @category Api
 */
export const AccountsApiLive = HttpApiBuilder.layer(AccountsApi).pipe(
    Layer.provide(AccountsGroupLive),
    Layer.provide(AuthorizationLive)
);

import * as VariantSchema from "@effect/experimental/VariantSchema";
import * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { HttpLayerRouter } from "@effect/platform";
import { Layer } from "effect";
import { Account, Repository } from "../domain/model.ts";

/** @internal */
const keyParam = HttpApiSchema.param("key", Schema.UUID);

/** @internal */
const accountType = HttpApiSchema.param("accountType", Schema.Literal("none", "readonly"));

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const CreateAccount = HttpApiEndpoint.post("create")`/accounts/new/${accountType}`.addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ViewAccount = HttpApiEndpoint.get("view")`/accounts/view/${keyParam}`.addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ListAccounts = HttpApiEndpoint.get("list")`/accounts/list`.addSuccess(Schema.Array(Account.json));

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const RevokeAccount = HttpApiEndpoint.put("revoke")`/accounts/revoke/${keyParam}`.addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const AuthorizeAccount = HttpApiEndpoint.put("authorize")`/accounts/grant/${keyParam}`.addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyScopes = HttpApiEndpoint.patch("scopes")`/accounts/${keyParam}/scopes`
    .setPayload(Schema.Struct({ scopes: Schema.ReadonlySet(Schema.String) }))
    .addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyRateLimit = HttpApiEndpoint.patch("rateLimit")`/accounts/${keyParam}/ratelimit`
    .setPayload(Schema.Struct({ limit: Schema.Int, window: Schema.DurationFromMillis }))
    .addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const ModifyDescription = HttpApiEndpoint.patch("description")`/accounts/${keyParam}/description`
    .setPayload(Schema.Struct({ description: Schema.OptionFromNullishOr(Schema.String, null) }))
    .addSuccess(Account.json);

/**
 * @since 1.0.0
 * @category Groups
 */
export const AccountsGroup = HttpApiGroup.make("AccountsGroup")
    .add(CreateAccount)
    .add(ViewAccount)
    .add(ListAccounts)
    .add(RevokeAccount)
    .add(AuthorizeAccount)
    .add(ModifyScopes)
    .add(ModifyRateLimit)
    .add(ModifyDescription);

/**
 * @since 1.0.0
 * @category Api
 */
export const AccountsApi = HttpApi.make("AccountsApi")
    .add(AccountsGroup)
    .addError(HttpApiError.NotFound)
    .addError(HttpApiError.BadRequest)
    .addError(HttpApiError.InternalServerError);

/** @internal */
const CreateHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "create",
    Effect.fnUntraced(function* ({ path: { accountType } }) {
        const repo = yield* Repository;
        const seededAccount = accountType === "none" ? repo.seededNoneAccount : repo.seededReadonlyAccount;
        return yield* repo.insert({
            createdAt: undefined,
            lastUsedAt: undefined,
            description: Option.none(),
            scopes: seededAccount.scopes,
            rateLimitLimit: seededAccount.rateLimitLimit,
            rateLimitWindow: seededAccount.rateLimitWindow,
        });
    })
);

/** @internal */
const ViewHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "view",
    Effect.fnUntraced(function* ({ path: { key } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);
        return yield* Option.match(maybeAccount, {
            onNone: () => Effect.fail(new HttpApiError.NotFound()),
            onSome: Effect.succeed,
        });
    })
);

/** @internal */
const ListHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "list",
    Effect.fnUntraced(function* () {
        const repo = yield* Repository;
        return yield* repo.listAll();
    }, Effect.orDie)
);

/** @internal */
const RevokeHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "revoke",
    Effect.fnUntraced(function* ({ path: { key } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);

        if (Option.isNone(maybeAccount)) {
            return yield* new HttpApiError.NotFound();
        }

        const account = maybeAccount.value;
        if (account.revoked) {
            return yield* new HttpApiError.BadRequest();
        }

        return yield* repo.update({
            ...account,
            revoked: true,
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });
    })
);

/** @internal */
const AuthorizeHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "authorize",
    Effect.fnUntraced(function* ({ path: { key } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);

        if (Option.isNone(maybeAccount)) {
            return yield* new HttpApiError.NotFound();
        }

        const account = maybeAccount.value;
        if (!account.revoked) {
            return yield* new HttpApiError.BadRequest();
        }

        return yield* repo.update({
            ...account,
            revoked: false,
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });
    })
);

/** @internal */
const ModifyScopesHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "scopes",
    Effect.fnUntraced(function* ({ path: { key }, payload: { scopes } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);

        if (Option.isNone(maybeAccount)) {
            return yield* new HttpApiError.NotFound();
        }

        const account = maybeAccount.value;
        return yield* repo.update({
            ...account,
            scopes,
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });
    })
);

/** @internal */
const ModifyRateLimitHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "rateLimit",
    Effect.fnUntraced(function* ({ path: { key }, payload: { limit, window } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);

        if (Option.isNone(maybeAccount)) {
            return yield* new HttpApiError.NotFound();
        }

        const account = maybeAccount.value;
        return yield* repo.update({
            ...account,
            rateLimitLimit: limit,
            rateLimitWindow: window,
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });
    })
);

/** @internal */
const ModifyDescriptionHandler = HttpApiBuilder.handler(
    AccountsApi,
    "AccountsGroup",
    "description",
    Effect.fnUntraced(function* ({ path: { key }, payload: { description } }) {
        const repo = yield* Repository;
        const maybeAccount = yield* repo.findById(key);

        if (Option.isNone(maybeAccount)) {
            return yield* new HttpApiError.NotFound();
        }

        const account = maybeAccount.value;
        return yield* repo.update({
            ...account,
            description,
            lastUsedAt: VariantSchema.Override(account.lastUsedAt),
        });
    })
);

/** @internal */
const AccountsGroupLive = HttpApiBuilder.group(AccountsApi, "AccountsGroup", (handlers) =>
    handlers
        .handle("create", CreateHandler)
        .handle("view", ViewHandler)
        .handle("list", ListHandler)
        .handle("revoke", RevokeHandler)
        .handle("authorize", AuthorizeHandler)
        .handle("scopes", ModifyScopesHandler)
        .handle("rateLimit", ModifyRateLimitHandler)
        .handle("description", ModifyDescriptionHandler)
);

/**
 * @since 1.0.0
 * @category Routes
 */
export const AllAccountsRoutes = HttpLayerRouter.addHttpApi(AccountsApi).pipe(Layer.provide(AccountsGroupLive));

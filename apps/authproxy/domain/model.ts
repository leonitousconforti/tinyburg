import { Model, SqlClient, SqlSchema } from "@effect/sql";
import { Context, Effect, Schema } from "effect";

/**
 * The current account in context, provided by middleware.
 *
 * @since 1.0.0
 * @category Tags
 */
export class CurrentAccount extends Context.Tag("@tinyburg/authproxy/model/CurrentAccount")<
    CurrentAccount,
    Account
>() {}

/**
 * An account in the authproxy system.
 *
 * @since 1.0.0
 * @category Models
 */
export class Account extends Model.Class<Account>("Account")({
    id: Model.Generated(Schema.NonNegativeInt),
    createdAt: Model.DateTimeInsertFromDate,
    lastUsedAt: Model.DateTimeUpdateFromDate,
    key: Model.Generated(Schema.UUID),
    revoked: Model.Generated(Schema.Boolean),
    scopes: Schema.Array(Schema.String),
    description: Schema.OptionFromNullishOr(Schema.String, null),
    rateLimitLimit: Schema.Int,
    rateLimitWindow: Schema.NumberFromString.pipe(
        Schema.compose(Schema.NonNegativeInt),
        Schema.compose(Schema.DurationFromMillis)
    ),
}) {}

/**
 * The repository for accounts.
 *
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Effect.Service<Repository>()("@tinyburg/authproxy/model/Repository", {
    accessors: true,
    dependencies: [],
    effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const listAll = SqlSchema.findAll({
            Request: Schema.Void,
            Result: Account.select,
            execute: () => sql`SELECT * FROM accounts`,
        });

        const repoById = yield* Model.makeRepository(Account, {
            idColumn: "id",
            tableName: "accounts",
            spanPrefix: "@tinyburg/authproxy/model/RepositoryById",
        });

        const repoByKey = yield* Model.makeRepository(Account, {
            idColumn: "key",
            tableName: "accounts",
            spanPrefix: "@tinyburg/authproxy/model/Repository/ByKey",
        });

        const seededNoneAccount = yield* Effect.flatten(repoById.findById(1));
        const seededReadonlyAccount = yield* Effect.flatten(repoById.findById(2));

        return {
            ...repoByKey,
            listAll,

            /** The none account will permit no scopes. */
            seededNoneAccount,

            /** The default account will permit all the read-only scopes. */
            seededReadonlyAccount,
        };
    }),
}) {}

import { Context, Effect, Schema, Layer, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

/**
 * The current account in context, provided by middleware.
 *
 * @since 1.0.0
 * @category Tags
 */
export class CurrentAccount extends Context.Service<CurrentAccount, Account>()(
    "@tinyburg/authproxy/model/CurrentAccount"
) {}

/**
 * An account in the authproxy system.
 *
 * @since 1.0.0
 * @category Models
 */
export class Account extends Model.Class<Account>("Account")({
    id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Model.GeneratedByDb),
    createdAt: Model.DateTimeInsertFromDate,
    lastUsedAt: Model.DateTimeUpdateFromDate,
    key: Schema.Union([
        Schema.String.check(Schema.isUUID()),
        Schema.Literal("00000000-0000-0000-0000-000000000001"),
        Schema.Literal("00000000-0000-0000-0000-000000000002"),
    ]).pipe(Model.FieldExcept(["insert"])),
    revoked: Schema.Boolean.pipe(Model.FieldExcept(["insert"])),
    scopes: Schema.UniqueArray(Schema.String).pipe(
        Schema.decodeTo(Schema.ReadonlySet(Schema.String), {
            encode: SchemaGetter.transform((set) => Array.from(set)),
            decode: SchemaGetter.transform((array) => new Set(array)),
        })
    ),
    description: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    rateLimitLimit: Schema.Int,
    rateLimitWindow: Schema.NumberFromString.pipe(
        Schema.check(Schema.isGreaterThanOrEqualTo(0)),
        Schema.decodeTo(Schema.Int),
        Schema.decodeTo(Schema.DurationFromMillis)
    ),
}) {}

/**
 * The repository for accounts.
 *
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Context.Service<Repository>()("@tinyburg/authproxy/model/Repository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const listAll = SqlSchema.findAll({
            Request: Schema.Void,
            Result: Account.select,
            execute: () => sql`SELECT * FROM accounts`,
        });

        const repoByKey = yield* SqlModel.makeRepository(Account, {
            spanPrefix: "@tinyburg/authproxy/model/Repository/ByKey",
            tableName: "accounts",
            idColumn: "key",
        });

        const seededNoneAccount = repoByKey.findById("00000000-0000-0000-0000-000000000001");
        const seededReadonlyAccount = repoByKey.findById("00000000-0000-0000-0000-000000000002");

        return {
            ...repoByKey,
            listAll,

            /** The none account will permit no scopes. */
            seededNoneAccount,

            /** The default account will permit all the read-only scopes. */
            seededReadonlyAccount,
        };
    }),
}) {
    static readonly Live = Layer.effect(Repository, Repository.make);
}

import { Context, Effect, Layer, Schema, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

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
 * The key of the seeded account that permits no scopes at all.
 *
 * @since 1.0.0
 * @category Constants
 */
export const NONE_ACCOUNT_KEY = "00000000-0000-0000-0000-000000000001";

/**
 * The key of the seeded public account that carries the read-only scopes.
 *
 * @since 1.0.0
 * @category Constants
 */
export const READONLY_ACCOUNT_KEY = "00000000-0000-0000-0000-000000000002";

/**
 * An account in the authproxy system.
 *
 * @since 1.0.0
 * @category Models
 */
export class Account extends Model.Class<Account>("Account")({
    id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Model.GeneratedByDb),
    revoked: Schema.Boolean.pipe(Model.FieldExcept(["insert"])),
    lastUsedAt: Model.DateTimeUpdateFromDate,
    createdAt: Model.DateTimeInsertFromDate,
    key: Schema.Union([
        Schema.String.check(Schema.isUUID()),
        Schema.Literal(NONE_ACCOUNT_KEY),
        Schema.Literal(READONLY_ACCOUNT_KEY),
    ]).pipe(Model.FieldExcept(["insert"])),
    scopes: Schema.UniqueArray(Schema.String).pipe(
        Schema.decodeTo(Schema.ReadonlySet(Schema.String), {
            encode: SchemaGetter.transform((set) => Array.from(set)),
            decode: SchemaGetter.transform((array) => new Set(array)),
        })
    ),
    description: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    ownerSub: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    rateLimitLimit: Schema.Int,
    rateLimitWindow: Schema.FiniteFromString.pipe(
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

        const repoByKey = yield* SqlModel.makeRepository(Account, {
            spanPrefix: "@tinyburg/authproxy/model/Repository/ByKey",
            tableName: "accounts",
            idColumn: "key",
        });

        const listAll = SqlSchema.findAll({
            Request: Schema.Void,
            Result: Account.select,
            execute: () => sql`SELECT * FROM accounts`,
        });

        const listForOwner = SqlSchema.findAll({
            Request: Schema.String.check(Schema.isUUID()),
            Result: Account.select,
            execute: (ownerSub) => sql`
                SELECT * FROM accounts
                WHERE owner_sub = ${ownerSub}
                ORDER BY created_at DESC
            `,
        });

        const countForOwner = SqlSchema.findOne({
            Request: Schema.String.check(Schema.isUUID()),
            Result: Schema.Struct({ count: Schema.Int }),
            execute: (ownerSub) => sql`
                SELECT COUNT(*)::int AS count FROM accounts
                WHERE owner_sub = ${ownerSub}
            `,
        });

        const rotateForOwner = SqlSchema.findOneOption({
            Request: Schema.Struct({
                key: Schema.String.check(Schema.isUUID()),
                ownerSub: Schema.String,
            }),
            Result: Account.select,
            execute: ({ key, ownerSub }) => sql`
                UPDATE accounts SET key = gen_random_uuid()
                WHERE key = ${key} AND owner_sub = ${ownerSub}
                RETURNING *
            `,
        });

        const setRevokedForOwner = SqlSchema.findOneOption({
            Request: Schema.Struct({
                key: Schema.String.check(Schema.isUUID()),
                ownerSub: Schema.String,
                revoked: Schema.Boolean,
            }),
            Result: Account.select,
            execute: ({ key, ownerSub, revoked }) => sql`
                UPDATE accounts SET revoked = ${revoked}
                WHERE key = ${key} AND owner_sub = ${ownerSub}
                RETURNING *
            `,
        });

        const deleteForOwner = SqlSchema.findOneOption({
            Request: Schema.Struct({ key: Schema.String.check(Schema.isUUID()), ownerSub: Schema.String }),
            Result: Schema.Struct({ key: Schema.String }),
            execute: ({ key, ownerSub }) => sql`
                DELETE FROM accounts
                WHERE key = ${key} AND owner_sub = ${ownerSub}
                RETURNING key::text
            `,
        });

        const seededNoneAccount = repoByKey.findById(NONE_ACCOUNT_KEY);
        const seededReadonlyAccount = repoByKey.findById(READONLY_ACCOUNT_KEY);

        return {
            ...repoByKey,
            listAll,
            listForOwner,
            countForOwner,
            rotateForOwner,
            setRevokedForOwner,
            deleteForOwner,

            /** The none account will permit no scopes. */
            seededNoneAccount,

            /** The default account will permit all the read-only scopes. */
            seededReadonlyAccount,
        };
    }),
}) {
    static readonly Live = Layer.effect(Repository, Repository.make);
}

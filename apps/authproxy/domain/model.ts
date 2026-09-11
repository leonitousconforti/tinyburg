import { Context, Effect, Layer, Schema, SchemaGetter } from "effect";
import { Model } from "effect/unstable/schema";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

/**
 * The current API key in context, provided by middleware.
 *
 * @since 1.0.0
 * @category Tags
 */
export class CurrentApiKey extends Context.Service<CurrentApiKey, ApiKey>()(
    "@tinyburg/authproxy/model/CurrentApiKey"
) {}

/**
 * The key of the seeded API key that permits no scopes at all.
 *
 * @since 1.0.0
 * @category Constants
 */
export const NONE_API_KEY = "00000000-0000-0000-0000-000000000001";

/**
 * The key of the seeded public API key that carries the read-only scopes.
 *
 * @since 1.0.0
 * @category Constants
 */
export const READONLY_API_KEY = "00000000-0000-0000-0000-000000000002";

/**
 * An API key in the authproxy system.
 *
 * @since 1.0.0
 * @category Models
 */
export class ApiKey extends Model.Class<ApiKey>("ApiKey")({
    id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Model.GeneratedByDb),
    revoked: Schema.Boolean.pipe(Model.FieldExcept(["insert"])),
    lastUsedAt: Model.DateTimeUpdateFromDate,
    createdAt: Model.DateTimeInsertFromDate,
    key: Schema.Union([
        Schema.String.check(Schema.isUUID()),
        Schema.Literal(NONE_API_KEY),
        Schema.Literal(READONLY_API_KEY),
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
 * The repository for API keys.
 *
 * @since 1.0.0
 * @category Services
 */
export class Repository extends Context.Service<Repository>()("@tinyburg/authproxy/model/Repository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        const repoByKey = yield* SqlModel.makeRepository(ApiKey, {
            spanPrefix: "@tinyburg/authproxy/model/Repository/ByKey",
            tableName: "api_keys",
            idColumn: "key",
        });

        const listAll = SqlSchema.findAll({
            Request: Schema.Void,
            Result: ApiKey.select,
            execute: () => sql`SELECT * FROM api_keys`,
        });

        const listForOwner = SqlSchema.findAll({
            Request: Schema.String.check(Schema.isUUID()),
            Result: ApiKey.select,
            execute: (ownerSub) => sql`
                SELECT * FROM api_keys
                WHERE owner_sub = ${ownerSub}
                ORDER BY created_at DESC
            `,
        });

        const countForOwner = SqlSchema.findOne({
            Request: Schema.String.check(Schema.isUUID()),
            Result: Schema.Struct({ count: Schema.Int }),
            execute: (ownerSub) => sql`
                SELECT COUNT(*)::int AS count FROM api_keys
                WHERE owner_sub = ${ownerSub}
            `,
        });

        const rotateForOwner = SqlSchema.findOneOption({
            Request: Schema.Struct({
                key: Schema.String.check(Schema.isUUID()),
                ownerSub: Schema.String,
            }),
            Result: ApiKey.select,
            execute: ({ key, ownerSub }) => sql`
                UPDATE api_keys SET key = gen_random_uuid()
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
            Result: ApiKey.select,
            execute: ({ key, ownerSub, revoked }) => sql`
                UPDATE api_keys SET revoked = ${revoked}
                WHERE key = ${key} AND owner_sub = ${ownerSub}
                RETURNING *
            `,
        });

        const deleteForOwner = SqlSchema.findOneOption({
            Request: Schema.Struct({ key: Schema.String.check(Schema.isUUID()), ownerSub: Schema.String }),
            Result: Schema.Struct({ key: Schema.String }),
            execute: ({ key, ownerSub }) => sql`
                DELETE FROM api_keys
                WHERE key = ${key} AND owner_sub = ${ownerSub}
                RETURNING key::text
            `,
        });

        const seededNoneApiKey = repoByKey.findById(NONE_API_KEY);
        const seededReadonlyApiKey = repoByKey.findById(READONLY_API_KEY);

        return {
            ...repoByKey,
            listAll,
            listForOwner,
            countForOwner,
            rotateForOwner,
            setRevokedForOwner,
            deleteForOwner,

            /** The none API key will permit no scopes. */
            seededNoneApiKey,

            /** The default API key will permit all the read-only scopes. */
            seededReadonlyApiKey,
        };
    }),
}) {
    static readonly Live = Layer.effect(Repository, Repository.make);
}

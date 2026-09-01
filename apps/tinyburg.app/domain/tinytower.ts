import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

import {
    type PlayerAuthKeySchema,
    type PlayerEmailSchema,
    PlayerIdSchema,
} from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { PendingTinyTowerAccount, TinyTowerAccount } from "./models.ts";

const UserId = Schema.String.check(Schema.isUUID());

/**
 * The accounts users have linked for one game, and the ones they are in the
 * middle of linking.
 *
 * A linked account is a player id and the auth key that proves the tower is
 * theirs, obtained by finishing Nimblebit's email verification. A pending one
 * is the half-finished version: the code has been emailed, and the row
 * remembers which burn bot asked for it, because Nimblebit ties the code to
 * the device that requested it and the same one has to present it.
 *
 * One repository per game over the same two models, because every game
 * Nimblebit runs links the same way; only the tables differ.
 */
const makeAccountsRepository = (tables: {
    readonly accounts: string;
    readonly pending: string;
    readonly spanPrefix: string;
}) =>
    Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const accountsTable = sql.literal(tables.accounts);
        const pendingTable = sql.literal(tables.pending);

        const accounts = yield* SqlModel.makeRepository(TinyTowerAccount, {
            spanPrefix: `${tables.spanPrefix}.accounts`,
            tableName: tables.accounts,
            idColumn: "id",
        });

        const pending = yield* SqlModel.makeRepository(PendingTinyTowerAccount, {
            spanPrefix: `${tables.spanPrefix}.pending`,
            tableName: tables.pending,
            idColumn: "id",
        });

        const listForUser = SqlSchema.findAll({
            Request: UserId,
            Result: TinyTowerAccount,
            execute: (userId) => sql`
                SELECT * FROM ${accountsTable}
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
            `,
        });

        /** The account, if this user is the one who linked it. */
        const findForUser = SqlSchema.findOneOption({
            Request: Schema.Struct({ userId: UserId, playerId: PlayerIdSchema }),
            Result: TinyTowerAccount,
            execute: ({ playerId, userId }) => sql`
                SELECT * FROM ${accountsTable}
                WHERE user_id = ${userId} AND player_id = ${playerId}
            `,
        });

        /** The account, whoever linked it: a player id links to one user at most. */
        const findByPlayerId = SqlSchema.findOneOption({
            Request: PlayerIdSchema,
            Result: TinyTowerAccount,
            execute: (playerId) => sql`
                SELECT * FROM ${accountsTable}
                WHERE player_id = ${playerId}
            `,
        });

        const link = (options: {
            readonly userId: string;
            readonly playerId: typeof PlayerIdSchema.Type;
            readonly playerAuthKey: typeof PlayerAuthKeySchema.Type;
            readonly playerEmail: typeof PlayerEmailSchema.Type;
        }): Effect.Effect<TinyTowerAccount, Schema.SchemaError | SqlError.SqlError> =>
            TinyTowerAccount.insert
                .makeEffect({
                    userId: options.userId,
                    playerId: options.playerId,
                    playerAuthKey: options.playerAuthKey,
                    playerEmail: options.playerEmail,
                })
                .pipe(
                    Effect.mapError((issue) => new Schema.SchemaError(issue)),
                    Effect.flatMap(accounts.insert)
                );

        /** Removes the link and says whether there was one. */
        const unlink = SqlSchema.findOneOption({
            Request: Schema.Struct({ userId: UserId, playerId: PlayerIdSchema }),
            Result: Schema.Struct({ playerId: Schema.String }),
            execute: ({ playerId, userId }) => sql`
                DELETE FROM ${accountsTable}
                WHERE user_id = ${userId} AND player_id = ${playerId}
                RETURNING player_id
            `,
        });

        /** The live link request for this user and player, if one is waiting on its code. */
        const findPending = SqlSchema.findOneOption({
            Request: Schema.Struct({ userId: UserId, playerId: PlayerIdSchema }),
            Result: PendingTinyTowerAccount,
            execute: ({ playerId, userId }) => sql`
                SELECT * FROM ${pendingTable}
                WHERE user_id = ${userId} AND player_id = ${playerId} AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            `,
        });

        /**
         * Records a link request, replacing any earlier one for the same
         * user and player: Nimblebit only honours the latest code it
         * emailed, so an older request could never be finished anyway.
         */
        const createPending = (options: {
            readonly userId: string;
            readonly playerId: typeof PlayerIdSchema.Type;
            readonly playerEmail: typeof PlayerEmailSchema.Type;
            readonly burnBotPlayerId: typeof PlayerIdSchema.Type;
            readonly burnBotAuthKey: typeof PlayerAuthKeySchema.Type;
        }): Effect.Effect<PendingTinyTowerAccount, Schema.SchemaError | SqlError.SqlError> =>
            Effect.gen(function* () {
                yield* sql`
                    DELETE FROM ${pendingTable}
                    WHERE user_id = ${options.userId} AND player_id = ${options.playerId}
                `;
                const row = yield* PendingTinyTowerAccount.insert
                    .makeEffect({
                        userId: options.userId,
                        playerId: options.playerId,
                        playerEmail: options.playerEmail,
                        burnBotPlayerId: options.burnBotPlayerId,
                        burnBotAuthKey: options.burnBotAuthKey,
                    })
                    .pipe(Effect.mapError((issue) => new Schema.SchemaError(issue)));
                return yield* pending.insert(row);
            });

        const deletePending = (id: string): Effect.Effect<void, Schema.SchemaError | SqlError.SqlError> =>
            pending.delete(id).pipe(Effect.asVoid);

        return {
            listForUser,
            findForUser,
            findByPlayerId,
            link,
            unlink: (options: { readonly userId: string; readonly playerId: typeof PlayerIdSchema.Type }) =>
                Effect.map(unlink(options), Option.isSome),
            findPending,
            createPending,
            deletePending,
        };
    });

/**
 * What a game's account repository offers, whichever game it is for.
 *
 * @since 1.0.0
 * @category Models
 */
export type GameAccountsRepository = Effect.Success<ReturnType<typeof makeAccountsRepository>>;

/**
 * @since 1.0.0
 * @category Services
 */
export class TinyTowerAccountsRepository extends Context.Service<TinyTowerAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/TinyTowerAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "tinytower_accounts",
            pending: "pending_tinytower_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.tinytower",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class TinyTowerClassicAccountsRepository extends Context.Service<
    TinyTowerClassicAccountsRepository,
    GameAccountsRepository
>()("@tinyburg/tinyburg.app/domain/TinyTowerClassicAccountsRepository") {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "tinytower_classic_accounts",
            pending: "pending_tinytower_classic_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.tinytowerClassic",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class PocketPlanesAccountsRepository extends Context.Service<PocketPlanesAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/PocketPlanesAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "pocketplanes_accounts",
            pending: "pending_pocketplanes_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.pocketplanes",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class PocketTrainsAccountsRepository extends Context.Service<PocketTrainsAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/PocketTrainsAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "pockettrains_accounts",
            pending: "pending_pockettrains_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.pockettrains",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class LegoTowerAccountsRepository extends Context.Service<LegoTowerAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/LegoTowerAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "legotower_accounts",
            pending: "pending_legotower_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.legotower",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class DiscoZooAccountsRepository extends Context.Service<DiscoZooAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/DiscoZooAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "discozoo_accounts",
            pending: "pending_discozoo_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.discozoo",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class BitCityAccountsRepository extends Context.Service<BitCityAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/BitCityAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "bitcity_accounts",
            pending: "pending_bitcity_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.bitcity",
        })
    );
}

/**
 * @since 1.0.0
 * @category Services
 */
export class TinyTowerVegasAccountsRepository extends Context.Service<TinyTowerVegasAccountsRepository, GameAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/TinyTowerVegasAccountsRepository"
) {
    static readonly Default = Layer.effect(
        this,
        makeAccountsRepository({
            accounts: "tinytowervegas_accounts",
            pending: "pending_tinytowervegas_accounts",
            spanPrefix: "tinyburg.app.domain.Repository.tinytowervegas",
        })
    );
}

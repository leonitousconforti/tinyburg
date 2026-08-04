import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Function, Layer, Schema } from "effect";
import { SqlClient, SqlSchema, SqlModel } from "effect/unstable/sql";

import { OAuthClient } from "./models.ts";

export class DevelopersRepository extends Context.Service<DevelopersRepository>()(
    "@tinyburg/tinyburg.app/domain/DevelopersRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const oauthClients = yield* SqlModel.makeRepository(OAuthClient, {
                spanPrefix: "tinyburg.app.domain.Repository.oauthClients",
                tableName: "oauth_clients",
                idColumn: "id",
            });

            const createOAuthClient = oauthClients.insert;
            const findOAuthClient = Function.flow(oauthClients.findById, Effect.catchNoSuchElement);

            const deleteOAuthClient = (options: {
                readonly clientId: string;
                readonly ownerUserId: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    DELETE FROM oauth_clients
                    WHERE id = ${options.clientId} AND owner_user_id = ${options.ownerUserId}
                `.pipe(Effect.asVoid);

            const listOAuthClients = SqlSchema.findAll({
                Request: Schema.String.check(Schema.isUUID()),
                Result: OAuthClient,
                execute: (ownerUserId) => sql`
                    SELECT * FROM oauth_clients
                    WHERE owner_user_id = ${ownerUserId}
                    ORDER BY created_at DESC
                `,
            });

            return {
                createOAuthClient,
                findOAuthClient,
                deleteOAuthClient,
                listOAuthClients,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, DevelopersRepository.make);

    /** The first-party app's client id. */
    static readonly FIRST_PARTY_CLIENT_ID = ""; // FIXME: make a migration that adds this
}

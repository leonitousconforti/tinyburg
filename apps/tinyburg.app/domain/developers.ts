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

            const deleteOAuthClient = (clientId: string, ownerUserId: string) =>
                Effect.asVoid(sql`DELETE FROM oauth_clients WHERE id = ${clientId} AND owner_user_id = ${ownerUserId}`);

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
}

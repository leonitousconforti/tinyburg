import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Function, Layer, Schema } from "effect";
import { SqlClient, SqlModel, SqlSchema } from "effect/unstable/sql";

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

            /**
             * A client registering itself (RFC 7591), keyed by the software it
             * is an installation of.
             *
             * An upsert rather than an insert, which is what makes registering
             * idempotent: a service that registers on every boot is handed the
             * same client back, with whatever it now says about itself, and so
             * has nothing of its own to remember between runs. A confidential
             * client's secret is replaced each time, because only its hash was
             * ever kept here and the client is told the new one in the same
             * response.
             */
            const registerOAuthClient = SqlSchema.findOne({
                Request: Schema.Struct({
                    softwareId: Schema.String,
                    name: Schema.String,
                    secretHash: Schema.NullOr(Schema.String),
                    scope: Schema.String,
                    redirectUris: Schema.NonEmptyArray(Schema.String),
                }),
                Result: OAuthClient,
                execute: (client) => sql`
                    INSERT INTO oauth_clients (software_id, owner_user_id, name, secret_hash, scope, redirect_uris)
                    VALUES (
                        ${client.softwareId},
                        NULL,
                        ${client.name},
                        ${client.secretHash},
                        ${client.scope},
                        ${client.redirectUris}
                    )
                    ON CONFLICT (software_id) WHERE software_id IS NOT NULL DO UPDATE SET
                        name = EXCLUDED.name,
                        secret_hash = EXCLUDED.secret_hash,
                        scope = EXCLUDED.scope,
                        redirect_uris = EXCLUDED.redirect_uris
                    RETURNING *
                `,
            });

            return {
                createOAuthClient,
                findOAuthClient,
                deleteOAuthClient,
                listOAuthClients,
                registerOAuthClient,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, DevelopersRepository.make);

    /** The first-party app's client id. */
    static readonly FIRST_PARTY_CLIENT_ID = "0868602a-9bf8-4e6e-ba20-ccd2b3acc832";
}

import { Effect, Context, Layer } from "effect";
import { SqlModel } from "effect/unstable/sql";

import { OAuthClient } from "./models.ts";

export class DevelopersRepository extends Context.Service<DevelopersRepository>()(
    "@tinyburg/tinyburg.app/domain/DevelopersRepository",
    {
        make: Effect.gen(function* () {
            const oauthClients = yield* SqlModel.makeRepository(OAuthClient, {
                spanPrefix: "tinyburg.app.domain.Repository.oauthClients",
                tableName: "oauth_clients",
                idColumn: "id",
            });

            return {
                createOAuthClient: oauthClients.insert,
                findOAuthClient: oauthClients.findById,
                deleteOAuthClient: oauthClients.delete,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, DevelopersRepository.make);
}

import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

/**
 * The authproxy's registration at the tinyburg.app OIDC provider, shared by
 * the sign-in round trip and the machine-to-machine lookup.
 *
 * Defaults keep the proxy booting before the client is registered at the
 * provider; sign in simply fails at tinyburg.app until the real values are
 * set. Admin elevation additionally needs the client secret (a confidential
 * client) and the `towers:lookup` scope in the client's registered scope.
 */
export const tinyburgConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.string("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3000/auth/callback")),
});

/** The linked-towers lookup response, as the trading api serves it. */
const LinkedTowers = Schema.Array(
    Schema.Struct({
        playerId: Schema.String,
        createdAt: Schema.String,
    })
);

/**
 * Asks tinyburg.app which towers a user has linked, right now. The proxy
 * authenticates as itself with the client_credentials grant, so eligibility
 * is evaluated live at elevation time rather than snapshotted at sign-in.
 *
 * @since 1.0.0
 * @category Services
 */
export class TinyburgLookup extends Context.Service<TinyburgLookup>()("@tinyburg/authproxy/TinyburgLookup", {
    make: Effect.gen(function* () {
        const config = yield* tinyburgConfig;
        const httpClient = yield* HttpClient.HttpClient;

        // A public client cannot authenticate for the lookup; elevation
        // simply never succeeds until a secret is configured.
        const fetchToken = Option.match(config.clientSecret, {
            onNone: () => Effect.fail(new Error("TINYBURG_CLIENT_SECRET is not configured")),
            onSome: (secret) =>
                Oidc.exchangeClientCredentials({
                    tokenEndpoint: `${config.issuer}/oauth/token`,
                    clientId: config.clientId,
                    clientSecret: Redacted.value(secret),
                }).pipe(
                    Effect.map((response) => response.access_token),
                    Effect.provideService(HttpClient.HttpClient, httpClient)
                ),
        });

        // Tokens live 900 seconds; cached well inside that, and a failure
        // invalidates the cache so the next attempt fetches fresh.
        const cachedToken = yield* Effect.cachedInvalidateWithTTL(fetchToken, "10 minutes").pipe(
            Effect.map(([cached, invalidate]) => Effect.tapError(cached, () => invalidate))
        );

        const linkedPlayerIds = (sub: string): Effect.Effect<ReadonlySet<string>, unknown, never> =>
            Effect.gen(function* () {
                const token = yield* cachedToken;
                const towers = yield* HttpClientRequest.get(
                    `${config.issuer}/v1/tinytower/linkedAccounts/lookup/${encodeURIComponent(sub)}`
                ).pipe(
                    HttpClientRequest.setHeader("authorization", `Bearer ${token}`),
                    HttpClient.execute,
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(LinkedTowers)),
                    Effect.provideService(HttpClient.HttpClient, httpClient)
                );

                return new Set(towers.map((tower) => tower.playerId));
            });

        return { linkedPlayerIds };
    }),
}) {
    static readonly Default = Layer.effect(this, TinyburgLookup.make);
}

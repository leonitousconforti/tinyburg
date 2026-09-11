/**
 * The treasury's standing at the provider: its registered client, the
 * provider's signing keys, and the scope it asks traders to grant.
 *
 * Registration happens at boot (RFC 7591), keyed on the software id, so the
 * treasury is the same client every run and nothing is persisted. Public
 * client: PKCE carries the proof on the connect flow, and refresh exchanges
 * present the client id alone.
 */

import type { Schema } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import { Config, Context, Effect, Layer, Option, Redacted, Ref, Schedule } from "effect";
import { HttpClient } from "effect/unstable/http";

import type { Jwt } from "effect-oidc";

import { TinyTower as TinyTowerScopes } from "@tinyburg/trading-sdk/Scopes";
import { DynamicClientRegistration, Oidc } from "effect-oidc";

/**
 * What the treasury asks a trader to grant, written out of the trading api's
 * scope tree rather than as strings, so the connect flow cannot ask for one
 * thing while the sagas call another.
 *
 * Deliberately absent: `tinytower:receive_gift`. Claiming a gift through the
 * api on a *player's* tower marks it received without the game ever applying
 * it - the item is destroyed. The treasury only ever claims gifts on its own
 * vault tower, with its own credentials, so the scope to do it to anyone
 * else is never even requested.
 */
export const USER_GRANT_SCOPES: ReadonlyArray<string> = [
    "openid",
    "offline_access",
    TinyTowerScopes.read.list_accounts.name,
    TinyTowerScopes.read.pull_save.name,
    TinyTowerScopes.read.check_version.name,
    TinyTowerScopes.write.send_item.name,
    TinyTowerScopes.write.push_save.name,
    TinyTowerScopes.write.push_snapshot.name,
];

const SOFTWARE_ID = "tinyburg-treasury";

const oidcConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3004/auth/callback")),
    /** Where the connect flow lives, as the browser reaches it. */
    publicUrl: Config.string("PUBLIC_URL").pipe(
        Config.withDefault("http://localhost:3004"),
        Config.map((url) => url.replace(/\/$/, ""))
    ),
    registrationToken: Config.option(Config.redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN")),
    development: Config.string("NODE_ENV").pipe(
        Config.withDefault("production"),
        Config.map((env) => env === "development")
    ),
});

/**
 * In the dev stack registration runs at boot, and the provider next door may
 * still be coming up: an unreachable provider is retried for a little under a
 * minute. A refusal is not retried - it would only be refused again.
 */
const registrationBackoff = Schedule.exponential("500 millis").pipe(
    Schedule.jittered,
    Schedule.upTo({ duration: "1 minute" })
);

export class TinyburgOidc extends Context.Service<TinyburgOidc>()("@tinyburg/treasury/services/TinyburgOidc", {
    make: Effect.gen(function* () {
        const config = yield* oidcConfig;
        const httpClient = yield* HttpClient.HttpClient;

        // Outside development the registration token is required, and is read
        // again here as such so a deployment without one fails naming the
        // setting, rather than being refused by the provider a minute of
        // retries later.
        const initialAccessToken = config.development
            ? Option.getOrUndefined(config.registrationToken)
            : yield* Config.redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN");

        const registration = yield* DynamicClientRegistration.register({
            issuer: config.issuer,
            initialAccessToken,
            metadata: {
                softwareId: SOFTWARE_ID,
                clientName: "Tinyburg Treasury",
                redirectUris: [config.redirectUri],
                tokenEndpointAuthMethod: "none",
                scopes: [...USER_GRANT_SCOPES],
                grantTypes: ["authorization_code", "refresh_token"],
            },
        }).pipe(
            Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: registrationBackoff }),
            Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${config.issuer} as client ${clientId}`))
        );

        // The provider's signing keys, cached with a last-good fallback so a
        // hiccup fetching them does not read as a failed sign in.
        const jwks: Effect.Effect<
            Schema.Schema.Type<typeof Jwt.JwksSchema>,
            HttpClientError.HttpClientError | Schema.SchemaError,
            never
        > = yield* Effect.flatMap(Ref.make(Option.none<Schema.Schema.Type<typeof Jwt.JwksSchema>>()), (lastGood) =>
            Oidc.fetchJwks(`${config.issuer}/.well-known/jwks.json`).pipe(
                Effect.provideService(HttpClient.HttpClient, httpClient),
                Effect.tap((fetched) => Ref.set(lastGood, Option.some(fetched))),
                Effect.catch((error) =>
                    Ref.get(lastGood).pipe(
                        Effect.flatMap(
                            Option.match({
                                onNone: () => Effect.fail(error),
                                onSome: Effect.succeed,
                            })
                        )
                    )
                ),
                Effect.cachedInvalidateWithTTL("10 minutes"),
                Effect.map(([cached, invalidate]) => Effect.tapError(cached, () => invalidate))
            )
        );

        return {
            issuer: config.issuer,
            publicUrl: config.publicUrl,
            redirectUri: config.redirectUri,
            clientId: registration.clientId,
            clientSecret: Option.map(registration.clientSecret, Redacted.value).pipe(Option.getOrUndefined),
            jwks,
        };
    }),
}) {
    static readonly Default = Layer.effect(TinyburgOidc, TinyburgOidc.make);
}

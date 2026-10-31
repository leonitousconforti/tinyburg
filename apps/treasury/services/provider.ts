/**
 * The treasury's standing at tinyburg.app: its registered client, the
 * provider's metadata, and the scope it asks traders to grant.
 *
 * Registration happens at boot (RFC 7591), keyed on the software id, so the
 * treasury is the same client every run and nothing is persisted. It is a
 * confidential client (`client_secret_basic`): it holds every trader's
 * offline refresh token, with `send_item` and `push_save`, and a refresh
 * token that leaked from a log, a heap dump or the sealed grants table must
 * be worth nothing without the secret as well. The provider mints a new
 * secret on every registration, so the one this boot was given is the only
 * one that works; it lives in memory and nowhere else. PKCE still guards
 * the connect flow. The protocol itself is `@yielded/oauth`'s; this module
 * only says which provider, which client, and which scopes.
 *
 * Boot waits for the provider: registering needs it, and so does everything
 * after (the connect flow, every saga's access token, the keys incoming
 * tokens are checked with). In the dev stack it starts next door at the same
 * time, so an unreachable provider is retried for about a minute before the
 * treasury gives up.
 */

import { Config, Context, Effect, Layer, Option, Schedule } from "effect";

import { TinyTower as TinyTowerScopes } from "@tinyburg/trading-sdk/Scopes";
import * as OAuth from "@yielded/oauth/OAuth";
import * as Oidc from "@yielded/oauth/Oidc";

import { register } from "./registration.ts";

/**
 * What the treasury asks a trader to grant, written out of the trading api's
 * scope tree rather than as strings, so the connect flow cannot ask for one
 * thing while the sagas call another. `openid` is there for the ID token,
 * which is how the callback learns whose grant it is storing.
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

/**
 * tinyburg.app's own app, the first party. Its id is fixed in tinyburg.app's
 * source (`DevelopersRepository.FIRST_PARTY_CLIENT_ID`) and seeded by its
 * migrations, the same in every deployment, so it is written out here too.
 */
export const FIRST_PARTY_CLIENT_ID = "0868602a-9bf8-4e6e-ba20-ccd2b3acc832";

/** How long any one call to the provider may take before it counts as unavailable. */
const PROVIDER_TIMEOUT_MS = 10_000;

const providerConfig = Config.all({
    /** tinyburg.app's own origin: the OAuth issuer, and where the Tinyburg api lives. */
    issuer: Config.String("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    redirectUri: Config.String("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3004/auth/callback")),
    /** Where the connect flow lives, as the browser reaches it. */
    publicUrl: Config.String("PUBLIC_URL").pipe(
        Config.withDefault("http://localhost:3004"),
        Config.map((url) => url.replace(/\/$/, ""))
    ),
    registrationToken: Config.option(Config.Redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN")),
    development: Config.String("NODE_ENV").pipe(
        Config.withDefault("production"),
        Config.map((env) => env === "development")
    ),
});

/**
 * An unreachable provider is retried for a little under a minute. A refusal
 * is not retried - it would only be refused again.
 */
const providerBackoff = Schedule.exponential("500 millis").pipe(
    Schedule.jittered,
    Schedule.upTo({ duration: "1 minute" })
);

export class TinyburgProvider extends Context.Service<TinyburgProvider>()(
    "@tinyburg/treasury/services/TinyburgProvider",
    {
        make: Effect.gen(function* () {
            const config = yield* providerConfig;

            // Outside development the registration token is required, and is
            // read again here as such so a deployment without one fails naming
            // the setting, rather than being refused by the provider a minute
            // of retries later.
            const initialAccessToken = config.development
                ? Option.getOrUndefined(config.registrationToken)
                : yield* Config.Redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN");

            const registration = yield* register(config.issuer, {
                initialAccessToken,
                metadata: {
                    software_id: SOFTWARE_ID,
                    client_name: "Tinyburg Treasury",
                    redirect_uris: [config.redirectUri],
                    token_endpoint_auth_method: "client_secret_basic",
                    grant_types: ["authorization_code", "refresh_token"],
                    scope: USER_GRANT_SCOPES.join(" "),
                },
            }).pipe(
                Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: providerBackoff }),
                Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${config.issuer} as client ${clientId}`))
            );

            const metadata = yield* Oidc.discover(config.issuer, { timeoutMs: PROVIDER_TIMEOUT_MS }).pipe(
                Effect.retry({ while: (error) => error._tag === "OAuthUnavailable", schedule: providerBackoff })
            );

            // A confidential client's registration answers with its secret;
            // one without is a provider that did not register what was asked.
            if (Option.isNone(registration.clientSecret)) {
                return yield* Effect.die(new Error(`${config.issuer} registered the treasury without a client secret`));
            }
            const authentication: OAuth.Authentication = {
                method: "client_secret_basic",
                secret: registration.clientSecret.value,
            };

            const client = yield* OAuth.make({
                metadata,
                clientId: registration.clientId,
                authentication,
                timeoutMs: PROVIDER_TIMEOUT_MS,
            });

            const idTokens = yield* Oidc.makeVerifier({
                metadata,
                clientId: registration.clientId,
                algorithms: ["RS256"],
                timeoutMs: PROVIDER_TIMEOUT_MS,
            });

            // Incoming access tokens are checked against the same keys the
            // provider signs ID tokens with, read from its discovery document
            // rather than guessed from its routes.
            if (metadata.jwks_uri === undefined) {
                return yield* Effect.die(new Error(`${config.issuer} publishes no jwks_uri`));
            }

            return {
                issuer: config.issuer,
                /**
                 * The one resource for the whole Tinyburg api: every access
                 * token tinyburg.app issues is for it, and the treasury, reached
                 * at `<site>/v1/treasury`, accepts the same tokens.
                 */
                resource: `${config.issuer}/v1`,
                jwksUri: metadata.jwks_uri,
                publicUrl: config.publicUrl,
                redirectUri: config.redirectUri,
                client,
                idTokens,
            } as const;
        }),
    }
) {
    static readonly Default = Layer.effect(TinyburgProvider, TinyburgProvider.make);
}

import { Config, Context, Duration, Effect, Exit, Layer, Option, Schedule, Scope } from "effect";
import { HttpClient } from "effect/http";

import * as OAuth from "@yielded/oauth/OAuth";
import * as Oidc from "@yielded/oauth/Oidc";

import { register } from "./registration.ts";

/**
 * The bot's registration at the tinyburg.app OIDC provider.
 *
 * `/link` only ever asks for `openid profile`: this slice binds a Discord
 * account to a Tinyburg account and nothing more. Reading someone's towers
 * is a separate, later consent, so the bot deliberately cannot do it yet.
 *
 * The bot is a confidential client. Unlike the authproxy, whose redirect
 * lands back in the same browser that holds the state cookie, the bot's
 * round trip is anchored only by the `state` it minted, so the client secret
 * is the second factor at the token endpoint.
 *
 * `TINYBURG_CLIENT_ID` names that registration and is required, with one
 * exception: when it is unset and the bot is either in development or holds
 * a `TINYBURG_REGISTRATION_TOKEN`, the bot registers itself at the provider
 * at boot (RFC 7591) under the redirect uri it is configured with. The
 * provider keys the registration on the software id, so the same client
 * comes back every boot and there is nothing to keep. Unset anywhere else is
 * the same failure any missing required setting is.
 */
const tinyburgConfig = Config.all({
    issuer: Config.String("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.option(Config.String("TINYBURG_CLIENT_ID")),
    clientSecret: Config.option(Config.Redacted("TINYBURG_CLIENT_SECRET")),
    // The provider's initial access token, which is what gates registration
    // outside development. Holding one is what lets a deployed bot register
    // itself on first boot instead of being registered by hand.
    registrationToken: Config.option(Config.Redacted("TINYBURG_REGISTRATION_TOKEN")),
    redirectUri: Config.String("TINYBURG_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:3003/discord/callback")
    ),
    development: Config.String("NODE_ENV").pipe(
        Config.withDefault("production"),
        Config.map((env) => env === "development")
    ),
});

/** Signing in asks for identity only. */
export const LINK_SCOPES = ["openid", "profile"];

/**
 * In the dev stack registration runs at boot, and the provider next door may
 * still be coming up: an unreachable provider is retried for a little under a
 * minute. A refusal is not retried - it would only be refused again.
 */
const registrationBackoff = Schedule.exponential("500 millis").pipe(
    Schedule.jittered,
    Schedule.upTo({ duration: "1 minute" })
);

/** How long any one call to the provider may take before it counts as unavailable. */
const PROVIDER_TIMEOUT_MILLIS = 10_000;

/**
 * The bot as a client of the provider: the issuer, the redirect uri, and the
 * credentials it presents, whichever way they were obtained. Resolved once at
 * boot, so the registration round trip happens before the first `/link`
 * rather than during it.
 *
 * The protocol itself is `@yielded/oauth`'s, behind `connected`. Reading the
 * provider's metadata for it waits for the first `/link` instead of holding up
 * boot, and a failed attempt is not remembered, so a provider that was down
 * is simply asked again next time.
 */
export class TinyburgClient extends Context.Service<TinyburgClient>()("@tinyburg/discord-bot/TinyburgClient", {
    make: Effect.gen(function* () {
        const config = yield* tinyburgConfig;
        const { issuer, redirectUri } = config;

        const { clientId, clientSecret } = yield* Effect.gen(function* () {
            if (Option.isSome(config.clientId)) {
                return { clientId: config.clientId.value, clientSecret: config.clientSecret };
            }

            if (!config.development && Option.isNone(config.registrationToken)) {
                // No client id and no way to obtain one. Reading the setting
                // again, now as required, fails the way every other missing
                // setting does: naming it.
                const clientId = yield* Config.String("TINYBURG_CLIENT_ID");
                return { clientId, clientSecret: config.clientSecret };
            }

            return yield* register(issuer, {
                initialAccessToken: Option.getOrUndefined(config.registrationToken),
                metadata: {
                    software_id: "tinyburg-discord-bot",
                    client_name: "Tinyburg Discord Bot",
                    redirect_uris: [redirectUri],
                    token_endpoint_auth_method: "client_secret_basic",
                    grant_types: ["authorization_code"],
                    scope: LINK_SCOPES.join(" "),
                },
            }).pipe(
                Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: registrationBackoff }),
                Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${issuer} as client ${clientId}`))
            );
        });

        const httpClient = yield* HttpClient.HttpClient;
        const scope = yield* Effect.scope;

        // The secret goes the way the bot registered to present it: Basic.
        const authentication: OAuth.Authentication = Option.match(clientSecret, {
            onNone: () => ({ method: "none", publicClient: true }),
            onSome: (secret) => ({ method: "client_secret_basic", secret }),
        });

        const connect = Effect.gen(function* () {
            const metadata = yield* Oidc.discover(issuer, { timeoutMs: PROVIDER_TIMEOUT_MILLIS });

            const verifier = yield* Oidc.makeVerifier({
                metadata,
                clientId,
                timeoutMs: PROVIDER_TIMEOUT_MILLIS,
                algorithms: ["RS256"],
            });

            const client = yield* OAuth.make({
                metadata,
                clientId,
                timeoutMs: PROVIDER_TIMEOUT_MILLIS,
                authentication,
            });

            return { client, verifier } as const;
        }).pipe(Effect.provideService(HttpClient.HttpClient, httpClient), Scope.provide(scope));

        const connected = yield* Effect.cachedWithTTL(connect, (exit) =>
            Exit.isSuccess(exit) ? Duration.infinity : Duration.zero
        );

        return { issuer, redirectUri, connected } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, TinyburgClient.make);
}

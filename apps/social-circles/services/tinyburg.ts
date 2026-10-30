/**
 * The study as a client of tinyburg.app.
 *
 * Both halves of the study talk to the provider under one registration: the
 * sign-in routes run the authorization code round trip, and the crawl trades
 * stored refresh tokens for access tokens hours later. The protocol itself is
 * `@yielded/oauth`'s; this module only says which provider, which client, and
 * when to read the provider's metadata.
 *
 * That last part is deferred to first use rather than done at boot. The study
 * has to come up while tinyburg.app is down or not yet running next door, so
 * a failed attempt is not remembered and the next request simply tries again;
 * a successful one is kept for the life of the process.
 */

import { Config, Context, Duration, Effect, Exit, Layer, Option, Scope } from "effect";
import { HttpClient } from "effect/http";

import * as OAuth from "@yielded/oauth/OAuth";
import * as Oidc from "@yielded/oauth/Oidc";

const tinyburgConfig = Config.all({
    issuer: Config.String("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    // The default keeps the study booting before its client is registered at
    // the provider; sign in simply fails at tinyburg.app until it is set.
    clientId: Config.String("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.Redacted("TINYBURG_CLIENT_SECRET")),
    redirectUri: Config.String("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3002/auth/callback")),
});

/** How long any one call to the provider may take before it counts as unavailable. */
const PROVIDER_TIMEOUT_MILLIS = 10_000;

export class TinyburgClient extends Context.Service<TinyburgClient>()(
    "@tinyburg/social-circles/services/TinyburgClient",
    {
        make: Effect.gen(function* () {
            const config = yield* tinyburgConfig;
            const httpClient = yield* HttpClient.HttpClient;
            const scope = yield* Effect.scope;

            // A public client unless a secret is configured, in which case it
            // travels in the form body, as it always has.
            const authentication: OAuth.Authentication = Option.match(config.clientSecret, {
                onNone: () => ({ method: "none", publicClient: true }),
                onSome: (secret) => ({ method: "client_secret_post", secret }),
            });

            /**
             * Two documents, because each half of the library wants a different
             * one. The id token verifier needs the OpenID document for its keys
             * and algorithms. The client is built from the OAuth one because
             * only that document lists how revocation authenticates; read off
             * the OpenID one, RFC 8414's default of Basic only would leave a
             * public client unable to revoke anything.
             */
            const connect = Effect.gen(function* () {
                const [openId, oauth] = yield* Effect.all(
                    [
                        Oidc.discover(config.issuer, { timeoutMs: PROVIDER_TIMEOUT_MILLIS }),
                        Oidc.discover(config.issuer, {
                            timeoutMs: PROVIDER_TIMEOUT_MILLIS,
                            metadataUrl: `${config.issuer}/.well-known/oauth-authorization-server`,
                        }),
                    ],
                    { concurrency: 2 }
                );

                const verifier = yield* Oidc.makeVerifier({
                    metadata: openId,
                    clientId: config.clientId,
                    timeoutMs: PROVIDER_TIMEOUT_MILLIS,
                    algorithms: ["RS256"],
                });

                const client = yield* OAuth.make({
                    metadata: oauth,
                    clientId: config.clientId,
                    timeoutMs: PROVIDER_TIMEOUT_MILLIS,
                    authentication,
                });

                return { client, verifier } as const;
            }).pipe(Effect.provideService(HttpClient.HttpClient, httpClient), Scope.provide(scope));

            const connected = yield* Effect.cachedWithTTL(connect, (exit) =>
                Exit.isSuccess(exit) ? Duration.infinity : Duration.zero
            );

            return {
                issuer: config.issuer,
                redirectUri: config.redirectUri,
                connected,
            } as const;
        }),
    }
) {
    static readonly Default = Layer.effect(TinyburgClient, TinyburgClient.make);
}

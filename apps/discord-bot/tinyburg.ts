import { Config, Context, Effect, Layer, Option, Schedule } from "effect";

import { DynamicClientRegistration } from "effect-oidc";

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
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.option(Config.string("TINYBURG_CLIENT_ID")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
    // The provider's initial access token, which is what gates registration
    // outside development. Holding one is what lets a deployed bot register
    // itself on first boot instead of being registered by hand.
    registrationToken: Config.option(Config.redacted("TINYBURG_REGISTRATION_TOKEN")),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:3003/discord/callback")
    ),
    development: Config.string("NODE_ENV").pipe(
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

/**
 * The bot as a client of the provider: the issuer, the redirect uri, and the
 * credentials it presents, whichever way they were obtained. Resolved once at
 * boot, so the registration round trip happens before the first `/link`
 * rather than during it.
 */
export class TinyburgClient extends Context.Service<TinyburgClient>()("@tinyburg/discord-bot/TinyburgClient", {
    make: Effect.gen(function* () {
        const config = yield* tinyburgConfig;
        const { issuer, redirectUri } = config;

        if (Option.isSome(config.clientId)) {
            return { issuer, redirectUri, clientId: config.clientId.value, clientSecret: config.clientSecret } as const;
        }

        if (!config.development && Option.isNone(config.registrationToken)) {
            // No client id and no way to obtain one. Reading the setting
            // again, now as required, fails the way every other missing
            // setting does: naming it.
            const clientId = yield* Config.string("TINYBURG_CLIENT_ID");
            return { issuer, redirectUri, clientId, clientSecret: config.clientSecret } as const;
        }

        const registration = yield* DynamicClientRegistration.register({
            issuer,
            initialAccessToken: Option.getOrUndefined(config.registrationToken),
            metadata: {
                softwareId: "tinyburg-discord-bot",
                clientName: "Tinyburg Discord Bot",
                redirectUris: [redirectUri],
                tokenEndpointAuthMethod: "client_secret_basic",
                scopes: LINK_SCOPES,
                grantTypes: ["authorization_code", "refresh_token"],
            },
        }).pipe(
            Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: registrationBackoff }),
            Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${issuer} as client ${clientId}`))
        );

        return {
            issuer,
            redirectUri,
            clientId: registration.clientId,
            clientSecret: registration.clientSecret,
        } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, TinyburgClient.make);
}

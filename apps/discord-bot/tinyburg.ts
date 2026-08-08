import { Config } from "effect";

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
 */
export const tinyburgConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.string("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:3003/discord/callback")
    ),
});

/** Signing in asks for identity only. */
export const LINK_SCOPES = ["openid", "profile"];

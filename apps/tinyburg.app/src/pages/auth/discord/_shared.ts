import { Config } from "effect";

export const authUrl = "https://discord.com/oauth2/authorize";
export const tokenUrl = "https://discord.com/api/oauth2/token";
export const revokeUrl = "https://discord.com/api/oauth2/token/revoke";

export const DiscordOAuthConfig = Config.all({
    clientId: Config.string("DISCORD_CLIENT_ID"),
    clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
    redirectUri: Config.string("DISCORD_REDIRECT_URI"),
});

export const DISCORD_OAUTH_STATE_COOKIE_NAME = "discord_oauth_state";
export const DISCORD_OAUTH_CODE_VERIFIER_COOKIE_NAME = "discord_oauth_code_verifier";

import { Config, Effect, Option, Schema } from "effect";

/**
 * OAuth configuration for Discord.
 *
 * @since 1.0.0
 * @category Configuration
 */
export const DiscordOAuthConfig = Effect.all({
    clientId: Config.string("DISCORD_CLIENT_ID"),
    clientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
    redirectUri: Config.string("DISCORD_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:4321/api/auth/discord/callback")
    ),
});

/**
 * Application configuration.
 *
 * @since 1.0.0
 * @category Configuration
 */
export const AppConfig = Effect.all({
    baseUrl: Config.string("BASE_URL").pipe(Config.withDefault("http://localhost:4321")),
    sessionCookieName: Config.string("SESSION_COOKIE_NAME").pipe(Config.withDefault("tinyburg_session")),
});

/**
 * Google user info response schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GoogleUserInfo = Schema.Struct({
    id: Schema.String,
    email: Schema.optional(Schema.String),
    verified_email: Schema.optional(Schema.Boolean),
    name: Schema.String,
    given_name: Schema.optional(Schema.String),
    family_name: Schema.optional(Schema.String),
    picture: Schema.optional(Schema.String),
});

/**
 * Discord user info response schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const DiscordUserInfo = Schema.Struct({
    id: Schema.String,
    username: Schema.String,
    discriminator: Schema.String,
    global_name: Schema.NullOr(Schema.String),
    avatar: Schema.NullOr(Schema.String),
    email: Schema.optional(Schema.String),
    verified: Schema.optional(Schema.Boolean),
});

/**
 * OAuth token response schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const OAuthTokenResponse = Schema.Struct({
    access_token: Schema.String,
    token_type: Schema.String,
    expires_in: Schema.optional(Schema.Number),
    refresh_token: Schema.optional(Schema.String),
    scope: Schema.optional(Schema.String),
});

/**
 * Generate the Google OAuth authorization URL.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getGoogleAuthUrl = (clientId: string, redirectUri: string, state: string): string => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "offline",
        prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Generate the Discord OAuth authorization URL.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getDiscordAuthUrl = (clientId: string, redirectUri: string, state: string): string => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify email",
        state,
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

/**
 * Exchange an authorization code for tokens with Google.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const exchangeGoogleCode = async (
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<Schema.Schema.Type<typeof OAuthTokenResponse>> => {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange Google code: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Exchange an authorization code for tokens with Discord.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const exchangeDiscordCode = async (
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<Schema.Schema.Type<typeof OAuthTokenResponse>> => {
    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange Discord code: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Get user info from Google.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getGoogleUserInfo = async (accessToken: string): Promise<Schema.Schema.Type<typeof GoogleUserInfo>> => {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to get Google user info: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Get user info from Discord.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getDiscordUserInfo = async (accessToken: string): Promise<Schema.Schema.Type<typeof DiscordUserInfo>> => {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to get Discord user info: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Get Discord avatar URL.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getDiscordAvatarUrl = (userId: string, avatarHash: string | null): Option.Option<string> => {
    if (!avatarHash) {
        return Option.none();
    }
    return Option.some(`https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`);
};

/**
 * Generate a random state string for OAuth.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const generateState = (): string => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Session cookie configuration.
 *
 * @since 1.0.0
 * @category Configuration
 */
export const SESSION_COOKIE_NAME = "tinyburg_session";
export const OAUTH_STATE_COOKIE_NAME = "tinyburg_oauth_state";

/**
 * Create a session cookie string.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const createSessionCookie = (sessionId: string, maxAgeDays: number = 30): string => {
    const maxAge = maxAgeDays * 24 * 60 * 60;
    return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
};

/**
 * Create a state cookie for OAuth CSRF protection.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const createStateCookie = (state: string): string => {
    // State cookie expires in 10 minutes
    return `${OAUTH_STATE_COOKIE_NAME}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
};

/**
 * Create a cookie that clears the session.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const clearSessionCookie = (): string => {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
};

/**
 * Parse cookies from a cookie header string.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const parseCookies = (cookieHeader: string | null): Record<string, string> => {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(";").map((cookie) => {
            const [key, ...valueParts] = cookie.trim().split("=");
            return [key, valueParts.join("=")];
        })
    );
};

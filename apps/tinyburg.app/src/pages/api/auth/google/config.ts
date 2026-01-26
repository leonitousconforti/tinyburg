import { Config } from "effect";

/**
 * OAuth configuration for Google.
 *
 * @since 1.0.0
 * @category Configuration
 */
export const GoogleOAuthConfig = Config.all({
    clientId: Config.string("GOOGLE_CLIENT_ID"),
    clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    redirectUri: Config.string("GOOGLE_REDIRECT_URI").pipe(
        Config.withDefault("http://localhost:4321/api/auth/google/callback")
    ),
});

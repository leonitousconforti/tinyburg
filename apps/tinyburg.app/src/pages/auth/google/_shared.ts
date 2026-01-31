import { Config } from "effect";

export const tokenUrl = "https://oauth2.googleapis.com/token";
export const revokeUrl = "https://oauth2.googleapis.com/revoke";
export const authUrl = "https://accounts.google.com/o/oauth2/v2/auth";

export const GoogleOAuthConfig = Config.all({
    clientId: Config.string("GOOGLE_CLIENT_ID"),
    clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    redirectUri: Config.string("GOOGLE_REDIRECT_URI"),
});

export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
export const GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME = "google_oauth_code_verifier";

import { Config } from "effect";

export const tokenUrl = "https://oauth2.googleapis.com/token";
export const authUrl = "https://accounts.google.com/o/oauth2/v2/auth";

export const GoogleOAuthConfig = Config.all({
    clientId: Config.string("GOOGLE_CLIENT_ID"),
    clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    redirectUri: Config.string("GOOGLE_REDIRECT_URI"),
});

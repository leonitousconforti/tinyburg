import { Config } from "effect";

/**
 * The authproxy's registration at the tinyburg.app OIDC provider, shared by
 * the sign-in round trip and the admin elevation re-authorization.
 *
 * Defaults keep the proxy booting before the client is registered at the
 * provider; sign in simply fails at tinyburg.app until the real values are
 * set. Admin elevation additionally needs `towers:read` in the client's
 * registered scope, so the elevation round trip may ask to see the visitor's
 * linked towers.
 */
export const tinyburgConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    clientId: Config.string("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3000/auth/callback")),
});

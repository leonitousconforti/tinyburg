import { Config, Option, type Redacted } from "effect";

/**
 * Whether the server is running in development.
 *
 * `NODE_ENV` defaults to production, so a deployment that forgets to set it
 * gets the strict behaviour everywhere this is read: Secure `__Host-` cookies
 * (`cookies.ts`) and gated dynamic client registration
 * (`routes/registration.ts`). Only an explicit `development` relaxes either.
 */
export const isDevelopment: Config.Config<boolean> = Config.string("NODE_ENV").pipe(
    Config.withDefault("production"),
    Config.map((env) => env === "development")
);

/**
 * Whether, and to whom, dynamic client registration (RFC 7591) is offered.
 *
 * In development it is open: the services next door register themselves and
 * nobody else can reach the endpoint. Anywhere else it is offered only when
 * `REGISTRATION_TOKEN` is set, and then only to a client presenting that
 * token (RFC 7591 Section 3, the initial access token), so a deployment that
 * sets nothing has no registration endpoint at all rather than an open one.
 */
export interface RegistrationPolicy {
    readonly offered: boolean;
    /** None means open; some means the bearer every registration must present. */
    readonly initialAccessToken: Option.Option<Redacted.Redacted>;
}

export const registrationPolicy: Config.Config<RegistrationPolicy> = Config.all({
    development: isDevelopment,
    token: Config.option(Config.redacted("REGISTRATION_TOKEN")),
}).pipe(
    Config.map(({ development, token }) => ({
        offered: development || Option.isSome(token),
        initialAccessToken: development ? Option.none() : token,
    }))
);

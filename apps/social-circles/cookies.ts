import type { SqlError } from "effect/unstable/sql";

import { Config, Context, Effect, Layer, Option, type Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session } from "./domain/sessions.ts";

import { sha256 } from "./crypto.ts";
import { SessionsRepository } from "./domain/sessions.ts";

/** The name of the cookie carrying the dashboard session. */
export const SESSION_COOKIE_NAME = "social_circles_session";

/**
 * The site's cookie policy, resolved once at boot so request handlers never
 * carry a config failure channel.
 *
 * Cookies demand https unless the environment explicitly says development, so a
 * production deploy that forgets to set NODE_ENV still ships Secure cookies.
 * Secure cookies also carry the `__Host-` prefix, which browsers accept only
 * over https, from the exact host, with no Domain attribute, so a hostile
 * subdomain can never plant a copy of the session or the OAuth round-trip
 * cookies. Plain names in development, where http would refuse the prefix.
 */
export class CookiePolicy extends Context.Service<CookiePolicy>()("@tinyburg/social-circles/CookiePolicy", {
    make: Effect.map(Config.string("NODE_ENV").pipe(Config.withDefault("production")), (env) => {
        const secure = env !== "development";
        const name = (base: string): string => (secure ? `__Host-${base}` : base);
        return { secure, name } as const;
    }),
}) {
    static readonly Default = Layer.effect(CookiePolicy, CookiePolicy.make);
}

/**
 * The session riding the cookie, if any. None for a missing, expired, or
 * unknown cookie; a repository failure stays in the error channel rather than
 * reading as signed out.
 */
export const maybeCurrentSession: Effect.Effect<
    Option.Option<Session>,
    Schema.SchemaError | SqlError.SqlError,
    CookiePolicy | HttpServerRequest.HttpServerRequest | SessionsRepository
> = Effect.gen(function* () {
    const cookiePolicy = yield* CookiePolicy;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const sessionToken = Option.fromNullishOr(request.cookies[cookiePolicy.name(SESSION_COOKIE_NAME)]);
    if (Option.isNone(sessionToken)) return Option.none();
    const sessionTokenHash = yield* sha256(sessionToken.value);
    return yield* SessionsRepository.use((repo) => repo.findSession(sessionTokenHash));
});

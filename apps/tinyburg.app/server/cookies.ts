import { Config, Effect, Option } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session, User } from "../domain/models.ts";

import { SessionsRepository } from "../domain/sessions.ts";
import { sha256 } from "./crypto.ts";

/** The name of the cookie used to store the provider session. */
export const PROVIDER_SESSION_COOKIE_NAME = "tinyburg_provider_session";

/**
 * Whether cookies demand https. On unless the environment explicitly says
 * development, so a production deploy that forgets to set NODE_ENV still
 * ships Secure cookies.
 */
export const SecureCookies: Config.Config<boolean> = Config.string("NODE_ENV").pipe(
    Config.withDefault("production"),
    Config.map((env) => env !== "development")
);

/**
 * Secure cookies carry the __Host- prefix, which browsers only accept over
 * https, from the exact host, with no Domain attribute. A hostile subdomain
 * can then never plant a copy of the session or OAuth round-trip cookies.
 * Plain names in development, where http would refuse the prefix outright.
 */
export const cookieName = (base: string): Effect.Effect<string, Config.ConfigError> =>
    Effect.map(SecureCookies, (secure) => (secure ? `__Host-${base}` : base));

/** Reads one of our cookies off the request, prefix-aware. */
export const readCookie = (
    base: string
): Effect.Effect<Option.Option<string>, Config.ConfigError, HttpServerRequest.HttpServerRequest> =>
    Effect.gen(function* () {
        const name = yield* cookieName(base);
        const request = yield* HttpServerRequest.HttpServerRequest;
        return Option.fromNullishOr(request.cookies[name]);
    });

/**
 * The user and session riding the provider session cookie, if any. None for
 * a missing, expired, or unknown cookie. The annotation is load-bearing: the
 * catchCause fallback otherwise infers an Option union that breaks curried
 * Option combinators at call sites.
 */
export const maybeCurrentUser: Effect.Effect<
    Option.Option<{
        readonly session: Session;
        readonly user: User;
    }>,
    never,
    HttpServerRequest.HttpServerRequest | SessionsRepository
> = Effect.gen(function* () {
    const sessionToken = yield* Effect.flatMap(readCookie(PROVIDER_SESSION_COOKIE_NAME), Effect.fromOption);
    const sessionTokenHash = yield* sha256(sessionToken);
    return yield* SessionsRepository.use((repo) => repo.findSessionWithUser(sessionTokenHash));
}).pipe(Effect.catchCause(() => Effect.succeedNone));

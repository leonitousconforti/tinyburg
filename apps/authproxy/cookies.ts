import type { SqlError } from "effect/unstable/sql";

import { Effect, Option, type Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session } from "./domain/sessions.ts";

import { CookiePolicy } from "@tinyburg/web-auth/CookiePolicy";
import { sha256 } from "@tinyburg/web-auth/Crypto";

import { SessionsRepository } from "./domain/sessions.ts";

export { CookiePolicy };

/** The name of the cookie used to store the self-service session. */
export const SESSION_COOKIE_NAME = "authproxy_session";

/**
 * The session riding the cookie, if any. None for a missing, expired, or
 * unknown cookie; a repository failure stays in the error channel rather
 * than reading as signed out.
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

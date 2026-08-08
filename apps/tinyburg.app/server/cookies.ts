import type { SqlError } from "effect/unstable/sql";

import { Effect, Option, type Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session, User } from "../domain/models.ts";

import { CookiePolicy } from "@tinyburg/web-auth/CookiePolicy";
import { sha256 } from "@tinyburg/web-auth/Crypto";

import { SessionsRepository } from "../domain/sessions.ts";

export { CookiePolicy };

/** The name of the cookie used to store the provider session. */
export const PROVIDER_SESSION_COOKIE_NAME = "tinyburg_provider_session";

/**
 * The user and session riding the provider session cookie, if any. None for a
 * missing, expired, or unknown cookie; a repository failure stays in the
 * error channel rather than reading as signed out. The annotation is
 * load-bearing: the early return otherwise infers an Option union that breaks
 * curried Option combinators at call sites.
 */
export const maybeCurrentUser: Effect.Effect<
    Option.Option<{
        readonly session: Session;
        readonly user: User;
    }>,
    Schema.SchemaError | SqlError.SqlError,
    CookiePolicy | HttpServerRequest.HttpServerRequest | SessionsRepository
> = Effect.gen(function* () {
    const cookiePolicy = yield* CookiePolicy;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const sessionToken = Option.fromNullishOr(request.cookies[cookiePolicy.name(PROVIDER_SESSION_COOKIE_NAME)]);
    if (Option.isNone(sessionToken)) return Option.none();
    const sessionTokenHash = yield* sha256(sessionToken.value);
    return yield* SessionsRepository.use((repo) => repo.findSessionWithUser(sessionTokenHash));
});

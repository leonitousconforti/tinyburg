import { Config, Effect, Option } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session, User } from "../domain/models.ts";

import { SessionsRepository } from "../domain/sessions.ts";

export const SESSION_ID_COOKIE_NAME = "session_id";

/** Only mark cookies as secure when deploying with https (prod). */
export const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

/** The account attached to the request's session cookie, treating errors as signed out. */
export const currentAccount: Effect.Effect<
    Option.Option<{ user: User; session: Session }>,
    never,
    HttpServerRequest.HttpServerRequest | SessionsRepository
> = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const sessionId = request.cookies[SESSION_ID_COOKIE_NAME];
    if (sessionId === undefined) return Option.none();
    return yield* SessionsRepository.use((repo) => repo.findUserBySession(sessionId)).pipe(
        Effect.catch(() => Effect.succeedNone)
    );
});

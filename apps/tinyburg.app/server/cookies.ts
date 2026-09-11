import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Option, type Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import type { Session, User } from "../domain/models.ts";

import { SessionsRepository } from "../domain/sessions.ts";
import { sha256 } from "./crypto.ts";
import { isDevelopment } from "./environment.ts";

/** The name of the cookie used to store the provider session. */
export const PROVIDER_SESSION_COOKIE_NAME = "tinyburg_provider_session";

/**
 * The site's cookie policy, resolved once at boot so request handlers never
 * carry a config failure channel.
 *
 * Cookies demand https unless the environment explicitly says development, so
 * a production deploy that forgets to set NODE_ENV still ships Secure
 * cookies. Secure cookies also carry the __Host- prefix, which browsers only
 * accept over https, from the exact host, with no Domain attribute: a hostile
 * subdomain can then never plant a copy of the session or OAuth round-trip
 * cookies. Plain names in development, where http would refuse the prefix.
 */
export class CookiePolicy extends Context.Service<CookiePolicy>()("@tinyburg/tinyburg.app/server/CookiePolicy", {
    make: Effect.map(isDevelopment, (development) => {
        const secure = !development;
        const name = (base: string): string => (secure ? `__Host-${base}` : base);
        return { secure, name } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, CookiePolicy.make);
}

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

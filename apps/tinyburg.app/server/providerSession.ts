import { Config, DateTime, Duration, Effect, Option, Schema, String } from "effect";
import { Cookies, HttpServerRequest } from "effect/unstable/http";

import type { User } from "../domain/models.ts";

import { Jwt } from "effect-oidc";

import { UsersRepository } from "../domain/users.ts";
import { OidcKeys } from "./keys.ts";

/**
 * The provider's own browser session, held as a short-lived signed JWT in an
 * httpOnly cookie. It authenticates the human at `/oauth/authorize` and the
 * consent screen, and nothing else: relying apps, the first-party SPA
 * included, authenticate with bearer access tokens. Keeping it a JWT means
 * the provider needs no session table.
 */
export const PROVIDER_SESSION_COOKIE = "tinyburg_session";

const SESSION_TTL = Duration.days(30);

/** Marks the token as a provider session so it can never be replayed as an
 *  access token at a resource server, and vice versa. */
const SESSION_TOKEN_TYPE = "tinyburg-session";

const SecureCookies = Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((env) => env === "production")
);

const SessionClaims = Schema.Struct({
    sub: Schema.String.check(Schema.isUUID()),
    typ: Schema.Literal(SESSION_TOKEN_TYPE),
});

const cookieOptions = (secure: boolean) =>
    ({
        httpOnly: true,
        path: "/",
        secure,
        sameSite: "lax",
    }) as const;

/** Mints the session cookie that marks this browser as signed in to the provider. */
export const issueProviderSession = (
    user: User
): Effect.Effect<Cookies.Cookie, Schema.SchemaError | Config.ConfigError, OidcKeys> =>
    Effect.gen(function* () {
        const keys = yield* OidcKeys;
        const secure = yield* SecureCookies;
        const now = yield* DateTime.now;
        const expires = DateTime.addDuration(now, SESSION_TTL);

        const token = yield* Jwt.sign({
            privateJwk: keys.privateJwk,
            payload: {
                iss: keys.issuer,
                sub: user.id,
                aud: keys.issuer,
                typ: SESSION_TOKEN_TYPE,
                iat: Math.floor(DateTime.toEpochMillis(now) / 1000),
                exp: Math.floor(DateTime.toEpochMillis(expires) / 1000),
            },
        });

        return Cookies.makeCookieUnsafe(PROVIDER_SESSION_COOKIE, token, {
            ...cookieOptions(secure),
            expires: DateTime.toDateUtc(expires),
        });
    });

/** Clears the session cookie. */
export const clearProviderSession: Effect.Effect<Cookies.Cookie, Config.ConfigError> = Effect.map(
    SecureCookies,
    (secure) =>
        Cookies.makeCookieUnsafe(PROVIDER_SESSION_COOKIE, String.empty, {
            ...cookieOptions(secure),
            expires: new Date(0),
        })
);

/**
 * The user this browser is signed in as, or None. Any failure to verify the
 * cookie reads as signed out, so a rotated key or a tampered token simply
 * sends the visitor back through login.
 */
export const currentUser: Effect.Effect<
    Option.Option<User>,
    never,
    HttpServerRequest.HttpServerRequest | OidcKeys | UsersRepository
> = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const request = yield* HttpServerRequest.HttpServerRequest;

    const token = Option.fromNullishOr(request.cookies[PROVIDER_SESSION_COOKIE]);
    if (Option.isNone(token)) return Option.none();

    const claims = yield* Jwt.verify(token.value, {
        jwks: keys.jwks,
        issuer: keys.issuer,
        audience: keys.issuer,
        algorithms: ["ES256"],
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(SessionClaims)), Effect.option);
    if (Option.isNone(claims)) return Option.none();

    return yield* UsersRepository.use((repo) => repo.findUserById(claims.value.sub)).pipe(
        Effect.catchCause(() => Effect.succeedNone)
    );
});

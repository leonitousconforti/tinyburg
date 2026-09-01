import type { SqlError } from "effect/unstable/sql";

import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import * as crypto from "node:crypto";

import type { OAuthAuthorizationRequest, OAuthClient } from "../../domain/models.ts";

import { all as gameScopes } from "@tinyburg/trading-sdk/Scopes";
import { type Language, fromAcceptLanguage } from "@tinyburg/shared-ui/Internationalization";
import { Jwt, Oidc } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OAuthAuthorizationRequest as AuthorizationRequestModel } from "../../domain/models.ts";
import { OidcRepository } from "../../domain/oidc.ts";
import { UsersRepository } from "../../domain/users.ts";
import { maybeCurrentUser } from "../cookies.ts";
import { sha256 } from "../crypto.ts";
import { registrationPolicy } from "../environment.ts";
import { OidcKeys } from "../keys.ts";
import * as ConsentPage from "../pages/consent.ts";
import * as ErrorPage from "../pages/error.ts";

const ACCESS_TOKEN_TTL_SECONDS = 900;
const ID_TOKEN_TTL_SECONDS = 900;

/**
 * How long a refresh token lives before the user has to sign in again.
 *
 * Long enough that a scheduled job is not evicted by a quiet fortnight, short
 * enough that an abandoned grant does not linger forever. Rotation issues a
 * fresh 30 days on every use, so an actively used grant is effectively
 * indefinite while an idle one lapses.
 */
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * The scope a client asks for when it needs to act while the user is away.
 * Without it the token endpoint issues no refresh token at all.
 */
const OFFLINE_ACCESS_SCOPE = "offline_access";

/**
 * Every scope a client may register for or request, as advertised in
 * discovery: the three OIDC ones, and every node of the game scope tree in
 * `@tinyburg/trading-sdk`, read off it rather than listed again here so a
 * scope an endpoint accepts is always one a client may ask for.
 */
export const SUPPORTED_SCOPES: ReadonlyArray<string> = [
    "openid",
    "profile",
    OFFLINE_ACCESS_SCOPE,
    ...gameScopes().map((scope) => scope.name),
];

/** Refresh tokens are opaque, like authorization codes, and stored only as a hash. */
const newOpaqueToken = (): string => crypto.randomUUID() + crypto.randomUUID();

export const noStore = { "cache-control": "no-store", pragma: "no-cache" };

/** A plain-text page for authorize errors that must never reach the client's
 *  redirect uri (unknown client, unregistered redirect, malformed request).
 *  Intentionally untranslated: OAuth protocol errors are developer-facing and
 *  stay English by convention. */
/**
 * The refusals the visitor sees as a page rather than as a redirect.
 *
 * The language is resolved per call from the request rather than being threaded
 * through every early return, which keeps the refusals one-liners where they
 * were plain text before.
 */
const badRequest = (error: ErrorPage.ErrorKey) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const language = fromAcceptLanguage(request.headers["accept-language"]);
        return yield* ErrorPage.respond({ error, language });
    });

const tokenError = (status: number, error: string) => HttpServerResponse.json({ error }, { status, headers: noStore });

const unauthorizedBearer = HttpServerResponse.empty({
    status: 401,
    headers: { "www-authenticate": "Bearer" },
});

export const scopesOf = (scope: string): ReadonlyArray<string> => scope.split(" ").filter((part) => part.length > 0);

/** Appends OAuth response parameters to a client's registered redirect uri. */
const redirectTo = (redirectUri: string, params: Record<string, string>): string => {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
};

const findClient = (clientId: string) => DevelopersRepository.use((repo) => repo.findOAuthClient(clientId));

/** The user signed in on the provider session cookie, if any. */
const currentUser = Effect.map(
    maybeCurrentUser,
    Option.map(({ user }) => user)
);

/** Public clients must present no secret; confidential clients must match. */
const clientSecretMatches = (client: OAuthClient, secret: string | undefined): Effect.Effect<boolean> =>
    Option.match(client.secretHash, {
        onNone: () => Effect.succeed(secret === undefined),
        onSome: (hash) =>
            secret === undefined
                ? Effect.succeed(false)
                : Effect.map(sha256(secret), (presented) => timingSafeEquals(presented, hash)),
    });

export const timingSafeEquals = (a: string, b: string): boolean =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Mints a single-use authorization code for an approved request and returns
 * the redirect back to the client. Only the code's hash is stored; the code
 * itself rides the redirect. None means the request expired or was already
 * approved.
 */
const issueAuthorizationCode = (
    request: OAuthAuthorizationRequest,
    userId: string
): Effect.Effect<Option.Option<string>, SqlError.SqlError | Schema.SchemaError, OidcRepository> =>
    Effect.gen(function* () {
        const code = crypto.randomUUID() + crypto.randomUUID();
        const codeHash = yield* sha256(code);
        const approved = yield* OidcRepository.use((repo) =>
            repo.approveAuthorizationRequest({ requestId: request.id, userId, codeHash })
        );
        return Option.map(approved, (row) => redirectTo(row.redirectUri, { code, state: row.state }));
    });

/**
 * Mints a refresh token and stores its hash, returning the token itself.
 *
 * `familyId` defaults to a new family, which is what a fresh authorization
 * starts; a rotation passes the family it descends from so reuse detection can
 * tear the whole lineage down at once.
 */
const issueRefreshToken = (options: {
    readonly clientId: string;
    readonly userId: string;
    readonly scope: string;
    readonly familyId?: string | undefined;
}): Effect.Effect<string, SqlError.SqlError, OidcRepository> =>
    Effect.gen(function* () {
        const token = newOpaqueToken();
        const tokenHash = yield* sha256(token);
        yield* OidcRepository.use((repo) =>
            repo.createRefreshToken({
                tokenHash,
                clientId: options.clientId,
                userId: options.userId,
                scope: options.scope,
                familyId: options.familyId ?? crypto.randomUUID(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
            })
        );
        return token;
    });

/**
 * The consent screen, rendered by `../pages/consent.ts`.
 *
 * `no-store` because the page names one client, one visitor and one
 * authorization request; a cached copy is a consent screen for somebody
 * else's grant.
 */
const consentPage = (client: OAuthClient, request: OAuthAuthorizationRequest, language: Language) =>
    ConsentPage.respond(ConsentPage.modelFor({ client, request, scopes: scopesOf(request.scope), language }));

// GET /oauth/authorize - the browser entry point of the code flow. Visitors
// without a provider session bounce through /login and come back here; bad
// clients or redirect uris render an error page (never a redirect); anything
// else answers to the client's redirect uri per RFC 6749.
const authorize = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const url = new URL(request.originalUrl, "http://localhost");

    const maybeUser = yield* currentUser;
    if (Option.isNone(maybeUser)) {
        return HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
    }
    const user = maybeUser.value;

    const decoded = yield* Schema.decodeUnknownEffect(Oidc.AuthorizationRequestSchema)(
        HttpServerRequest.searchParamsFromURL(url)
    ).pipe(Effect.option);
    if (Option.isNone(decoded)) {
        return yield* badRequest("malformedRequest");
    }
    const params = decoded.value;

    const maybeClient = yield* findClient(params.client_id);
    if (Option.isNone(maybeClient)) return yield* badRequest("unknownClient");
    const client = maybeClient.value;
    if (!client.redirectUris.includes(params.redirect_uri)) {
        return yield* badRequest("unregisteredRedirectUri");
    }

    const allowed = new Set(scopesOf(client.scope));
    const requested = scopesOf(params.scope);
    if (requested.length === 0 || !requested.every((scope) => allowed.has(scope))) {
        return HttpServerResponse.redirect(
            redirectTo(params.redirect_uri, { error: "invalid_scope", state: params.state })
        );
    }

    const insert = yield* AuthorizationRequestModel.insert.makeEffect({
        clientId: client.id,
        userId: user.id,
        redirectUri: params.redirect_uri,
        scope: requested.join(" "),
        state: params.state,
        nonce: Option.fromNullishOr(params.nonce),
        codeChallenge: params.code_challenge,
        codeHash: Option.none(),
    });
    const created = yield* OidcRepository.use((repo) => repo.createAuthorizationRequest(insert));

    // Every third party asks permission on every authorization; consent is
    // never remembered. The first party is the app the visitor is already
    // using, so prompting it to authorize itself would be noise.
    if (client.id !== DevelopersRepository.FIRST_PARTY_CLIENT_ID) {
        const language = fromAcceptLanguage(request.headers["accept-language"]);
        return yield* consentPage(client, created, language);
    }

    const redirect = yield* issueAuthorizationCode(created, user.id);
    if (Option.isNone(redirect)) return yield* badRequest("expiredRequest");
    return HttpServerResponse.redirect(redirect.value);
});

const ConsentDecision = Schema.Struct({
    request_id: Schema.String.check(Schema.isUUID()),
    decision: Schema.Literals(["approve", "deny"]),
});

// POST /oauth/consent - the decision from the screen above.
const consent = Effect.gen(function* () {
    const maybeUser = yield* currentUser;
    if (Option.isNone(maybeUser)) return HttpServerResponse.redirect("/login");
    const user = maybeUser.value;

    const decoded = yield* HttpServerRequest.schemaBodyUrlParams(ConsentDecision).pipe(Effect.option);
    if (Option.isNone(decoded)) return yield* badRequest("malformedDecision");
    const { decision, request_id: requestId } = decoded.value;

    const maybeRequest = yield* OidcRepository.use((repo) => repo.findAuthorizationRequest(requestId));
    if (Option.isNone(maybeRequest) || maybeRequest.value.userId !== user.id) {
        return yield* badRequest("expiredRequest");
    }
    const request = maybeRequest.value;

    if (decision === "deny") {
        // Best effort: the visitor already denied, so they get their redirect
        // even if the cleanup fails; the sweeper purges the row later anyway.
        yield* OidcRepository.use((repo) => repo.deleteAuthorizationRequest(request.id)).pipe(
            Effect.catchCause((cause) => Effect.logWarning("failed to delete a denied authorization request", cause))
        );
        return HttpServerResponse.redirect(
            redirectTo(request.redirectUri, { error: "access_denied", state: request.state })
        );
    }

    const redirect = yield* issueAuthorizationCode(request, user.id);
    if (Option.isNone(redirect)) return yield* badRequest("expiredRequest");
    return HttpServerResponse.redirect(redirect.value);
});

// The early exits return never-typed values; the normal path runs to the end.
// oxlint-disable-next-line typescript/consistent-return
const token = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const request = yield* HttpServerRequest.HttpServerRequest;

    const decoded = yield* HttpServerRequest.schemaBodyUrlParams(Oidc.TokenRequestSchema).pipe(Effect.option);
    if (Option.isNone(decoded)) return yield* tokenError(400, "invalid_request");
    const body = decoded.value;

    const auth = Oidc.clientAuthentication({
        authorization: request.headers["authorization"],
        request: body,
    });
    if (Option.isNone(auth)) return yield* tokenError(401, "invalid_client");

    const maybeClient = yield* findClient(auth.value.clientId);
    if (Option.isNone(maybeClient)) return yield* tokenError(401, "invalid_client");
    const client = maybeClient.value;
    if (!(yield* clientSecretMatches(client, auth.value.clientSecret))) {
        return yield* tokenError(401, "invalid_client");
    }

    switch (body.grant_type) {
        case "authorization_code": {
            const codeHash = yield* sha256(body.code);
            const maybeGrant = yield* OidcRepository.use((repo) => repo.consumeAuthorizationCode(codeHash));
            if (Option.isNone(maybeGrant)) return yield* tokenError(400, "invalid_grant");
            const grant = maybeGrant.value;

            const presentedChallenge = yield* sha256(body.code_verifier);
            if (
                grant.clientId !== client.id ||
                grant.redirectUri !== body.redirect_uri ||
                !timingSafeEquals(presentedChallenge, grant.codeChallenge)
            ) {
                return yield* tokenError(400, "invalid_grant");
            }

            const maybeUser = yield* UsersRepository.use((repo) => repo.findUserById(grant.userId));
            if (Option.isNone(maybeUser)) return yield* tokenError(400, "invalid_grant");
            const user = maybeUser.value;

            const scopes = scopesOf(grant.scope);
            const accessToken = yield* Oidc.issueAccessToken({
                privateJwk: keys.privateJwk,
                issuer: keys.issuer,
                subject: user.id,
                audience: keys.issuer,
                clientId: client.id,
                scope: grant.scope,
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
            });

            const idToken = scopes.includes("openid")
                ? Option.some(
                      yield* Oidc.issueIdToken({
                          privateJwk: keys.privateJwk,
                          issuer: keys.issuer,
                          subject: user.id,
                          clientId: client.id,
                          ttlSeconds: ID_TOKEN_TTL_SECONDS,
                          nonce: Option.getOrUndefined(grant.nonce),
                          profile: scopes.includes("profile")
                              ? { name: user.displayName, picture: Option.getOrUndefined(user.avatarUrl) }
                              : undefined,
                      })
                  )
                : Option.none<string>();

            /**
             * A refresh token only exists if the user approved `offline_access`.
             * Handing one out unasked would quietly convert every sign-in into a
             * standing grant.
             */
            const refreshToken = scopes.includes(OFFLINE_ACCESS_SCOPE)
                ? Option.some(yield* issueRefreshToken({ clientId: client.id, userId: user.id, scope: grant.scope }))
                : Option.none<string>();

            return yield* HttpServerResponse.json(
                {
                    access_token: accessToken,
                    token_type: "Bearer",
                    expires_in: ACCESS_TOKEN_TTL_SECONDS,
                    scope: grant.scope,
                    ...Option.match(idToken, {
                        onNone: () => ({}),
                        onSome: (id_token) => ({ id_token }),
                    }),
                    ...Option.match(refreshToken, {
                        onNone: () => ({}),
                        onSome: (refresh_token) => ({ refresh_token }),
                    }),
                },
                { headers: noStore }
            );
        }
        case "client_credentials": {
            // Machine to machine is for confidential clients only
            if (Option.isNone(client.secretHash)) return yield* tokenError(401, "invalid_client");
            const allowed = new Set(scopesOf(client.scope));
            const requested = body.scope === undefined ? scopesOf(client.scope) : scopesOf(body.scope);
            if (!requested.every((scope) => allowed.has(scope))) return yield* tokenError(400, "invalid_scope");

            const accessToken = yield* Oidc.issueAccessToken({
                privateJwk: keys.privateJwk,
                issuer: keys.issuer,
                subject: client.id,
                audience: keys.issuer,
                clientId: client.id,
                scope: requested.join(" "),
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
            });

            return yield* HttpServerResponse.json(
                {
                    access_token: accessToken,
                    token_type: "Bearer",
                    expires_in: ACCESS_TOKEN_TTL_SECONDS,
                    scope: requested.join(" "),
                },
                { headers: noStore }
            );
        }
        case "refresh_token": {
            const tokenHash = yield* sha256(body.refresh_token);
            const maybeStored = yield* OidcRepository.use((repo) => repo.findRefreshToken(tokenHash));
            if (Option.isNone(maybeStored)) return yield* tokenError(400, "invalid_grant");
            const stored = maybeStored.value;

            // A token is only valid for the client it was minted for, so a
            // leaked token cannot be spent by a different application.
            if (stored.clientId !== client.id) return yield* tokenError(400, "invalid_grant");

            // The family is already torn down; nothing to distinguish here.
            if (Option.isSome(stored.revokedAt)) return yield* tokenError(400, "invalid_grant");

            /**
             * Reuse. Either the real client replayed a token it already spent or
             * somebody else is spending a stolen one, and there is no way to
             * tell which, so the whole lineage goes. This is the entire reason
             * rotation is worth the bookkeeping.
             */
            if (Option.isSome(stored.consumedAt)) {
                const revoked = yield* OidcRepository.use((repo) => repo.revokeRefreshTokenFamily(stored.familyId));
                yield* Effect.logWarning(
                    `refresh token reuse detected for client ${client.id}, revoked ${revoked} tokens in family ${stored.familyId}`
                );
                return yield* tokenError(400, "invalid_grant");
            }

            // Plain expiry is not evidence of theft, so the family survives and
            // the user simply signs in again.
            const now = yield* DateTime.now;
            if (DateTime.isGreaterThanOrEqualTo(now, stored.expiresAt)) {
                return yield* tokenError(400, "invalid_grant");
            }

            /**
             * The consume is the real gate: it only updates a row that is still
             * live, so two simultaneous refreshes with the same token cannot
             * both win. Losing here means somebody else spent it in the last
             * few milliseconds, which is the same signal as reuse above.
             */
            const consumed = yield* OidcRepository.use((repo) => repo.consumeRefreshToken(tokenHash));
            if (!consumed) {
                const revoked = yield* OidcRepository.use((repo) => repo.revokeRefreshTokenFamily(stored.familyId));
                yield* Effect.logWarning(
                    `concurrent refresh token use for client ${client.id}, revoked ${revoked} tokens in family ${stored.familyId}`
                );
                return yield* tokenError(400, "invalid_grant");
            }

            /**
             * The new access token carries exactly the scope the user approved.
             *
             * RFC 6749 lets a refresh request narrow this, but the token request
             * schema carries no `scope` on the refresh grant, so there is
             * nothing to narrow with. Reading the scope off the stored row
             * rather than the request is also the stronger guarantee: a refresh
             * cannot widen a grant even if that field appears later.
             */
            const grantedScope = stored.scope;

            const maybeUser = yield* UsersRepository.use((repo) => repo.findUserById(stored.userId));
            if (Option.isNone(maybeUser)) return yield* tokenError(400, "invalid_grant");
            const user = maybeUser.value;

            const accessToken = yield* Oidc.issueAccessToken({
                privateJwk: keys.privateJwk,
                issuer: keys.issuer,
                subject: user.id,
                audience: keys.issuer,
                clientId: client.id,
                scope: grantedScope,
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
            });

            // The replacement carries the same grant and stays in the family.
            const rotated = yield* issueRefreshToken({
                clientId: client.id,
                userId: user.id,
                scope: grantedScope,
                familyId: stored.familyId,
            });

            return yield* HttpServerResponse.json(
                {
                    access_token: accessToken,
                    token_type: "Bearer",
                    expires_in: ACCESS_TOKEN_TTL_SECONDS,
                    scope: grantedScope,
                    refresh_token: rotated,
                },
                { headers: noStore }
            );
        }
    }
});

/** The verified, unrevoked access-token claims carried by a bearer header. */
const bearerClaims = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const request = yield* HttpServerRequest.HttpServerRequest;

    const header = Option.fromNullishOr(request.headers["authorization"]).pipe(
        Option.filter((value) => value.startsWith("Bearer "))
    );
    if (Option.isNone(header)) return Option.none();

    const claims = yield* Jwt.verify(header.value.slice("Bearer ".length), {
        jwks: keys.jwks,
        issuer: keys.issuer,
        audience: keys.issuer,
        algorithms: ["ES256"],
        /*
          RFC 9068: an access token says so in its header. Without this, the
          only things keeping an id token from being spent here are that it
          carries `aud = clientId` rather than the issuer, and that it has no
          `scope` claim for `AccessTokenClaimsSchema` to find - two accidents
          rather than a check. `issueAccessToken` stamps `at+jwt` and
          `issueIdToken` stamps `JWT`, so this separates them by name.

          `ResourceServer.layer` pins the same value for the trading api; this
          is the provider's own endpoint doing it too.
        */
        types: ["at+jwt"],
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Oidc.AccessTokenClaimsSchema)), Effect.option);
    if (Option.isNone(claims)) return Option.none();

    const revoked = yield* Option.match(Option.fromNullishOr(claims.value.jti), {
        onNone: () => Effect.succeed(false),
        onSome: (jti) => OidcRepository.use((repo) => repo.isTokenRevoked(jti)),
    });
    return revoked ? Option.none() : claims;
});

const userinfo = Effect.gen(function* () {
    const maybeClaims = yield* bearerClaims;
    if (Option.isNone(maybeClaims)) return unauthorizedBearer;
    const claims = maybeClaims.value;

    const scopes = scopesOf(claims.scope);
    if (!scopes.includes("openid")) {
        return HttpServerResponse.empty({
            status: 403,
            headers: { "www-authenticate": 'Bearer error="insufficient_scope"' },
        });
    }

    const maybeUser = yield* UsersRepository.use((repo) => repo.findUserById(claims.sub));
    if (Option.isNone(maybeUser)) return unauthorizedBearer;
    const user = maybeUser.value;

    return yield* HttpServerResponse.json(
        {
            sub: user.id,
            ...(scopes.includes("profile")
                ? {
                      name: user.displayName,
                      ...Option.match(user.avatarUrl, {
                          onNone: () => ({}),
                          onSome: (picture) => ({ picture }),
                      }),
                  }
                : {}),
        },
        { headers: noStore }
    );
});

// The revocation request body plus the client_secret_post authentication
// parameters, decoded together because the body can only be read once.
const RevocationBody = Schema.Struct({
    token: Schema.String,
    token_type_hint: Schema.optional(Schema.String),
    client_id: Schema.optional(Schema.String),
    client_secret: Schema.optional(Schema.String),
});

// POST /oauth/revoke - RFC 7009. Always answers 200 for well-formed,
// authenticated requests so callers cannot probe token validity.
const revoke = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const request = yield* HttpServerRequest.HttpServerRequest;

    const decoded = yield* HttpServerRequest.schemaBodyUrlParams(RevocationBody).pipe(Effect.option);
    if (Option.isNone(decoded)) return yield* tokenError(400, "invalid_request");

    const auth = Oidc.clientAuthentication({
        authorization: request.headers["authorization"],
        request: decoded.value,
    });
    if (Option.isNone(auth)) return yield* tokenError(401, "invalid_client");

    const maybeClient = yield* findClient(auth.value.clientId);
    if (Option.isNone(maybeClient)) return yield* tokenError(401, "invalid_client");
    const client = maybeClient.value;
    if (!(yield* clientSecretMatches(client, auth.value.clientSecret))) {
        return yield* tokenError(401, "invalid_client");
    }

    const verified = yield* Jwt.verify(decoded.value.token, {
        jwks: keys.jwks,
        issuer: keys.issuer,
        audience: keys.issuer,
        algorithms: ["ES256"],
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Oidc.AccessTokenClaimsSchema)), Effect.option);

    // Only the client a token was issued to may revoke it
    yield* Option.match(verified, {
        onNone: () => Effect.void,
        onSome: (claims) =>
            claims.client_id === client.id && claims.jti !== undefined
                ? OidcRepository.use((repo) =>
                      // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                      repo.revokeToken({ jti: claims.jti as string, expiresAt: new Date(claims.exp * 1000) })
                  )
                : Effect.void,
    });

    return HttpServerResponse.empty({ status: 200, headers: noStore });
});

/**
 * The discovery document, with the scopes this provider actually supports and,
 * where the registration policy offers it, the registration endpoint
 * (`./registration.ts`). A deployment that offers none advertises none, so a
 * client reading discovery learns there is nothing to register with rather
 * than finding out from a 404.
 */
const discovery = (registrationOffered: boolean) =>
    Effect.flatMap(OidcKeys, (keys) =>
        HttpServerResponse.json({
            ...Oidc.makeDiscoveryDocument(keys.issuer),
            scopes_supported: SUPPORTED_SCOPES,
            ...(registrationOffered ? { registration_endpoint: `${keys.issuer}/oauth/register` } : {}),
        })
    );

const jwks = Effect.gen(function* () {
    const keys = yield* OidcKeys;
    const encoded = yield* Schema.encodeEffect(Jwt.JwksSchema)(keys.jwks);
    return yield* HttpServerResponse.json(encoded);
});

/**
 * The "Sign in with Tinyburg" OIDC provider. Public clients (the first-party
 * SPA included) authenticate with PKCE and no secret; confidential clients
 * additionally present their secret.
 */
export const OidcProviderLive = Layer.unwrap(
    Effect.map(registrationPolicy, (registration) =>
        Layer.mergeAll(
            HttpRouter.add("GET", "/.well-known/openid-configuration", discovery(registration.offered)),
            HttpRouter.add("GET", "/.well-known/jwks.json", jwks),
            HttpRouter.add("GET", "/oauth/authorize", authorize),
            HttpRouter.add("POST", "/oauth/consent", consent),
            HttpRouter.add("POST", "/oauth/token", token),
            HttpRouter.add("GET", "/oauth/userinfo", userinfo),
            HttpRouter.add("POST", "/oauth/revoke", revoke)
        )
    )
);

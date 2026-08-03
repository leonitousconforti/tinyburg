import { Config, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import * as crypto from "node:crypto";

import type { OAuthClient, User } from "../../domain/models.ts";

import { Jwt, Oidc } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OAuthAuthorizationRequest } from "../../domain/models.ts";
import { OIDCRepository } from "../../domain/oidc.ts";
import { UsersRepository } from "../../domain/users.ts";
import { Sha256CodeChallenge } from "../crypto.ts";
import { authorizationRedirect, issueAuthorizationCode, scopesOf } from "../grants.ts";
import { currentAccount } from "../session.ts";

const ACCESS_TOKEN_TTL_SECONDS = 900;
const ID_TOKEN_TTL_SECONDS = 900;

interface OidcKeys {
    readonly issuer: string;
    readonly privateJwk: Schema.Schema.Type<typeof Jwt.PrivateJwkSchema>;
    readonly jwks: Schema.Schema.Type<typeof Jwt.JwksSchema>;
}

const OidcConfig = Config.all({
    issuer: Config.string("SITE_URL").pipe(Config.withDefault("https://tinyburg.app")),
    privateJwk: Config.redacted("OIDC_PRIVATE_JWK"),
});

/** A plain-text page for authorize errors that must never reach the client's
 *  redirect uri (unknown client, unregistered redirect, malformed request). */
const badRequest = (message: string) => HttpServerResponse.text(message, { status: 400 });

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

const tokenError = (status: number, error: string) => HttpServerResponse.json({ error }, { status, headers: noStore });

const unauthorizedBearer = HttpServerResponse.empty({
    status: 401,
    headers: { "www-authenticate": "Bearer" },
});

/** Verifies a presented client secret against the registration: public
 *  clients must not send one, confidential clients must match. */
const clientSecretMatches = (client: OAuthClient, secret: string | undefined) =>
    Option.match(client.secretHash, {
        onNone: () => Effect.succeed(secret === undefined),
        onSome: (hash) =>
            secret === undefined
                ? Effect.succeed(false)
                : Effect.map(
                      Sha256CodeChallenge(secret),
                      (presented) =>
                          presented.length === hash.length &&
                          crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(hash))
                  ),
    });

const findClient = (clientId: string) =>
    DevelopersRepository.use((repo) => repo.findOAuthClient(clientId)).pipe(Effect.catch(() => Effect.succeedNone));

// GET /oauth/authorize - the browser entry point of the code flow. Signed-out
// visitors bounce through /login and return here; bad clients or redirect
// uris render an error page (never a redirect); everything else answers to
// the client's redirect uri per RFC 6749.
const authorize = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const url = new URL(request.originalUrl, "http://localhost");

    const maybeAccount = yield* currentAccount;
    if (Option.isNone(maybeAccount)) {
        return HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
    }
    const { user } = maybeAccount.value;

    const decoded = yield* Schema.decodeUnknownEffect(Oidc.AuthorizationRequestSchema)(
        HttpServerRequest.searchParamsFromURL(url)
    ).pipe(Effect.option);
    if (Option.isNone(decoded)) {
        return badRequest("This authorization request is malformed. PKCE with S256 is required.");
    }
    const params = decoded.value;

    const maybeClient = yield* findClient(params.client_id);
    if (Option.isNone(maybeClient)) return badRequest("Unknown client.");
    const client = maybeClient.value;
    if (!client.redirectUris.includes(params.redirect_uri)) {
        return badRequest("The redirect uri is not registered for this client.");
    }

    const allowed = new Set(scopesOf(client.scope));
    const requested = scopesOf(params.scope);
    if (requested.length === 0 || !requested.every((scope) => allowed.has(scope))) {
        return HttpServerResponse.redirect(
            authorizationRedirect(params.redirect_uri, { error: "invalid_scope", state: params.state })
        );
    }

    const insert = yield* OAuthAuthorizationRequest.insert.makeEffect({
        clientId: client.id,
        userId: user.id,
        redirectUri: params.redirect_uri,
        scope: requested.join(" "),
        state: params.state,
        nonce: Option.fromNullishOr(params.nonce),
        codeChallenge: params.code_challenge,
        codeHash: Option.none(),
    });
    const created = yield* OIDCRepository.use((repo) => repo.createAuthorizationRequest(insert)).pipe(Effect.orDie);

    // A remembered consent covering every requested scope skips the screen
    const consent = yield* OIDCRepository.use((repo) =>
        repo.findConsent({ userId: user.id, clientId: client.id })
    ).pipe(Effect.orDie);
    const consented = Option.isSome(consent) && requested.every((s) => scopesOf(consent.value.scope).includes(s));
    if (consented) {
        const redirect = yield* issueAuthorizationCode(created, user.id);
        if (Option.isSome(redirect)) return HttpServerResponse.redirect(redirect.value);
        return badRequest("This authorization request has expired. Please start over.");
    }

    return HttpServerResponse.redirect(`/oauth/consent?request=${created.id}`);
});

const token = (keys: OidcKeys) =>
    Effect.gen(function* () {
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
                const codeHash = yield* Sha256CodeChallenge(body.code);
                const maybeGrant = yield* OIDCRepository.use((repo) => repo.consumeAuthorizationCode(codeHash)).pipe(
                    Effect.orDie
                );
                if (Option.isNone(maybeGrant)) return yield* tokenError(400, "invalid_grant");
                const grant = maybeGrant.value;

                const verifierChallenge = yield* Sha256CodeChallenge(body.code_verifier);
                if (
                    grant.clientId !== client.id ||
                    grant.redirectUri !== body.redirect_uri ||
                    verifierChallenge !== grant.codeChallenge
                ) {
                    return yield* tokenError(400, "invalid_grant");
                }

                const maybeUser = yield* UsersRepository.use((repo) => repo.findUserById(grant.userId)).pipe(
                    Effect.catch(() => Effect.succeedNone)
                );
                if (Option.isNone(maybeUser)) return yield* tokenError(400, "invalid_grant");
                const user: User = maybeUser.value;

                const scopes = scopesOf(grant.scope);
                const accessToken = yield* Oidc.issueAccessToken({
                    privateJwk: keys.privateJwk,
                    issuer: keys.issuer,
                    subject: user.id,
                    audience: keys.issuer,
                    clientId: client.id,
                    scope: grant.scope,
                    ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
                }).pipe(Effect.orDie);

                const idToken = scopes.includes("openid")
                    ? yield* Oidc.issueIdToken({
                          privateJwk: keys.privateJwk,
                          issuer: keys.issuer,
                          subject: user.id,
                          clientId: client.id,
                          ttlSeconds: ID_TOKEN_TTL_SECONDS,
                          nonce: Option.getOrUndefined(grant.nonce),
                          profile: scopes.includes("profile")
                              ? { name: user.displayName, picture: Option.getOrUndefined(user.avatarUrl) }
                              : undefined,
                      }).pipe(Effect.orDie)
                    : undefined;

                return yield* HttpServerResponse.json(
                    {
                        access_token: accessToken,
                        token_type: "Bearer",
                        expires_in: ACCESS_TOKEN_TTL_SECONDS,
                        scope: grant.scope,
                        ...(idToken !== undefined ? { id_token: idToken } : {}),
                    },
                    { headers: noStore }
                );
            }
            case "client_credentials": {
                // Machine to machine is for confidential clients only
                if (Option.isNone(client.secretHash)) return yield* tokenError(401, "invalid_client");
                const allowed = new Set(scopesOf(client.scope));
                const requested = body.scope === undefined ? scopesOf(client.scope) : scopesOf(body.scope);
                if (!requested.every((scope) => allowed.has(scope))) {
                    return yield* tokenError(400, "invalid_scope");
                }
                const accessToken = yield* Oidc.issueAccessToken({
                    privateJwk: keys.privateJwk,
                    issuer: keys.issuer,
                    subject: client.id,
                    audience: keys.issuer,
                    clientId: client.id,
                    scope: requested.join(" "),
                    ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
                }).pipe(Effect.orDie);
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
                return yield* tokenError(400, "unsupported_grant_type");
            }
        }
    });

const userinfo = (keys: OidcKeys) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const header = request.headers["authorization"];
        if (header === undefined || !header.startsWith("Bearer ")) return unauthorizedBearer;

        const verified = yield* Jwt.verify(header.slice("Bearer ".length), {
            jwks: keys.jwks,
            issuer: keys.issuer,
            audience: keys.issuer,
            algorithms: ["ES256"],
        }).pipe(Effect.option);
        if (Option.isNone(verified)) return unauthorizedBearer;

        const claims = yield* Schema.decodeUnknownEffect(Oidc.AccessTokenClaimsSchema)(verified.value).pipe(
            Effect.option
        );
        if (Option.isNone(claims)) return unauthorizedBearer;

        if (verified.value.jti !== undefined) {
            const revoked = yield* OIDCRepository.use((repo) => repo.isTokenRevoked(verified.value.jti as string)).pipe(
                Effect.orDie
            );
            if (revoked) return unauthorizedBearer;
        }

        const scopes = scopesOf(claims.value.scope);
        if (!scopes.includes("openid")) {
            return HttpServerResponse.empty({
                status: 403,
                headers: { "www-authenticate": 'Bearer error="insufficient_scope"' },
            });
        }

        const maybeUser = yield* UsersRepository.use((repo) => repo.findUserById(claims.value.sub)).pipe(
            Effect.catch(() => Effect.succeedNone)
        );
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
const RevocationBodySchema = Schema.Struct({
    token: Schema.String,
    token_type_hint: Schema.optional(Schema.String),
    client_id: Schema.optional(Schema.String),
    client_secret: Schema.optional(Schema.String),
});

// POST /oauth/revoke - RFC 7009. Always answers 200 for well-formed,
// authenticated requests so callers cannot probe token validity.
const revoke = (keys: OidcKeys) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const decoded = yield* HttpServerRequest.schemaBodyUrlParams(RevocationBodySchema).pipe(Effect.option);
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
            algorithms: ["ES256"],
        }).pipe(Effect.option);
        if (Option.isSome(verified) && verified.value.jti !== undefined) {
            const claims = yield* Schema.decodeUnknownEffect(Oidc.AccessTokenClaimsSchema)(verified.value).pipe(
                Effect.option
            );
            // Only the client a token was issued to may revoke it
            const owned = Option.isSome(claims) && claims.value.client_id === client.id;
            if (owned) {
                yield* OIDCRepository.use((repo) =>
                    repo.revokeToken({
                        jti: verified.value.jti as string,
                        expiresAt: new Date(verified.value.exp * 1000),
                    })
                ).pipe(Effect.orDie);
            }
        }

        return HttpServerResponse.empty({ status: 200, headers: noStore });
    });

const discovery = (keys: OidcKeys) => HttpServerResponse.json(Oidc.makeDiscoveryDocument(keys.issuer));

const jwksRoute = (keys: OidcKeys) =>
    Effect.flatMap(Schema.encodeUnknownEffect(Jwt.JwksSchema)(keys.jwks), (encoded) =>
        HttpServerResponse.json(encoded)
    );

/**
 * The "Sign in with Tinyburg" OIDC provider. Requires OIDC_PRIVATE_JWK (an
 * ES256 private JWK, see Jwt.generateSigningKey); without it the provider
 * routes are not mounted and the rest of the app works as before.
 */
export const OidcProviderLive = Layer.unwrap(
    Effect.gen(function* () {
        const maybeConfig = yield* Config.option(OidcConfig);
        if (Option.isNone(maybeConfig)) {
            yield* Effect.logWarning("OIDC provider disabled: OIDC_PRIVATE_JWK is not set");
            return Layer.empty;
        }

        const privateJwk = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Jwt.PrivateJwkSchema))(
            Redacted.value(maybeConfig.value.privateJwk)
        );
        // The public half drops the private scalar and re-declares key_ops for
        // verification; a signing key's ["sign"] would make Jwt.verify reject
        // it as an unknown key.
        const { d: _d, key_ops: _keyOps, ...rest } = privateJwk;
        const publicJwk = { ...rest, key_ops: ["verify"] as const };
        const keys: OidcKeys = {
            issuer: maybeConfig.value.issuer.replace(/\/$/, ""),
            privateJwk,
            jwks: { keys: [publicJwk] },
        };

        return Layer.mergeAll(
            HttpRouter.add("GET", "/.well-known/openid-configuration", discovery(keys)),
            HttpRouter.add("GET", "/.well-known/jwks.json", jwksRoute(keys)),
            HttpRouter.add("GET", "/oauth/authorize", authorize),
            HttpRouter.add("POST", "/oauth/token", token(keys)),
            HttpRouter.add("GET", "/oauth/userinfo", userinfo(keys)),
            HttpRouter.add("POST", "/oauth/revoke", revoke(keys))
        );
    })
);

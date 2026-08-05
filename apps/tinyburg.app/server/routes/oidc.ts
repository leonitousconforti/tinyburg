import type { SqlError } from "effect/unstable/sql";

import { Effect, Layer, Option, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import * as crypto from "node:crypto";

import type { OAuthAuthorizationRequest, OAuthClient } from "../../domain/models.ts";

import { Jwt, Oidc } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { OAuthAuthorizationRequest as AuthorizationRequestModel } from "../../domain/models.ts";
import { OidcRepository } from "../../domain/oidc.ts";
import { UsersRepository } from "../../domain/users.ts";
import { maybeCurrentUser } from "../cookies.ts";
import { sha256 } from "../crypto.ts";
import { OidcKeys } from "../keys.ts";

const ACCESS_TOKEN_TTL_SECONDS = 900;
const ID_TOKEN_TTL_SECONDS = 900;

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

/** A plain-text page for authorize errors that must never reach the client's
 *  redirect uri (unknown client, unregistered redirect, malformed request). */
const badRequest = (message: string) => HttpServerResponse.text(message, { status: 400 });

const tokenError = (status: number, error: string) => HttpServerResponse.json({ error }, { status, headers: noStore });

const unauthorizedBearer = HttpServerResponse.empty({
    status: 401,
    headers: { "www-authenticate": "Bearer" },
});

const scopesOf = (scope: string): ReadonlyArray<string> => scope.split(" ").filter((part) => part.length > 0);

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

const timingSafeEquals = (a: string, b: string): boolean =>
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

const escapeHtml = (value: string): string =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const scopeDescriptions: Record<string, string> = {
    openid: "Confirm your Tinyburg identity",
    profile: "See your display name and avatar",
    towers: "See and manage the TinyTower saves you have linked",
};

/**
 * The consent screen is server-rendered rather than a SPA route: during a
 * third-party authorization the browser holds no access token for the SPA to
 * authenticate with, only the provider session cookie this page runs on.
 */
const consentPage = (client: OAuthClient, request: OAuthAuthorizationRequest) =>
    HttpServerResponse.html(
        `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>Authorize ${escapeHtml(client.name)} | Tinyburg</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  :root { color-scheme: light }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family: ui-monospace, SFMono-Regular, monospace; color:#2c3e50;
         background:linear-gradient(180deg,#87ceeb 0%,#4fa4d4 50%,#2d7bb3 100%); padding:2rem }
  .card { background:rgba(255,255,255,.95); border:3px solid #ffd700; border-radius:1rem;
          box-shadow:6px 6px 0 rgba(0,0,0,.25); padding:2rem; max-width:28rem; width:100% }
  h1 { font-size:1.25rem; margin:0 0 .25rem; text-align:center }
  p.lead { text-align:center; margin:0 0 1.5rem; color:#4a5568 }
  ul { list-style:none; padding:1rem; margin:0 0 1.5rem; border:2px solid rgba(79,164,212,.2);
       background:rgba(79,164,212,.1); border-radius:.5rem }
  li { padding:.25rem 0 }
  .row { display:flex; flex-direction:column; gap:.75rem }
  button { font:inherit; cursor:pointer; border-radius:.5rem; padding:.9rem 1.5rem;
           box-shadow:4px 4px 0 rgba(0,0,0,.2); border:2px solid transparent }
  .approve { background:#ffd700 }
  .deny { background:#fff; border-color:#cbd5e0 }
  .dest { text-align:center; font-size:.85rem; color:#4a5568; margin-top:1.5rem }
</style>
</head>
<body>
  <main class="card">
    <h1>${escapeHtml(client.name)}</h1>
    <p class="lead">wants to access your Tinyburg account</p>
    <ul>
      ${scopesOf(request.scope)
          .map((scope) => `<li>✅ ${escapeHtml(scopeDescriptions[scope] ?? scope)}</li>`)
          .join("\n      ")}
    </ul>
    <form method="post" action="/oauth/consent" class="row">
      <input type="hidden" name="request_id" value="${escapeHtml(request.id)}" />
      <button class="approve" type="submit" name="decision" value="approve">Authorize</button>
      <button class="deny" type="submit" name="decision" value="deny">Cancel</button>
    </form>
    <p class="dest">After authorizing you'll be sent back to ${escapeHtml(new URL(request.redirectUri).host)}</p>
  </main>
</body>
</html>`
    ).pipe(HttpServerResponse.setHeader("cache-control", "no-store"));

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
    if (client.id !== DevelopersRepository.FIRST_PARTY_CLIENT_ID) return consentPage(client, created);

    const redirect = yield* issueAuthorizationCode(created, user.id);
    return Option.match(redirect, {
        onNone: () => badRequest("This authorization request has expired. Please start over."),
        onSome: (location) => HttpServerResponse.redirect(location),
    });
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
    if (Option.isNone(decoded)) return badRequest("This consent decision is malformed.");
    const { decision, request_id: requestId } = decoded.value;

    const maybeRequest = yield* OidcRepository.use((repo) => repo.findAuthorizationRequest(requestId));
    if (Option.isNone(maybeRequest) || maybeRequest.value.userId !== user.id) {
        return badRequest("This authorization request has expired. Please start over.");
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
    return Option.match(redirect, {
        onNone: () => badRequest("This authorization request has expired. Please start over."),
        onSome: (location) => HttpServerResponse.redirect(location),
    });
});

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
            // Public clients re-authorize silently against the provider
            // session instead, which keeps no refresh token in the browser.
            return yield* tokenError(400, "unsupported_grant_type");
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
                      repo.revokeToken({ jti: claims.jti as string, expiresAt: new Date(claims.exp * 1000) })
                  )
                : Effect.void,
    });

    return HttpServerResponse.empty({ status: 200, headers: noStore });
});

const discovery = Effect.flatMap(OidcKeys, (keys) => HttpServerResponse.json(Oidc.makeDiscoveryDocument(keys.issuer)));

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
export const OidcProviderLive = Layer.mergeAll(
    HttpRouter.add("GET", "/.well-known/openid-configuration", discovery),
    HttpRouter.add("GET", "/.well-known/jwks.json", jwks),
    HttpRouter.add("GET", "/oauth/authorize", authorize),
    HttpRouter.add("POST", "/oauth/consent", consent),
    HttpRouter.add("POST", "/oauth/token", token),
    HttpRouter.add("GET", "/oauth/userinfo", userinfo),
    HttpRouter.add("POST", "/oauth/revoke", revoke)
);

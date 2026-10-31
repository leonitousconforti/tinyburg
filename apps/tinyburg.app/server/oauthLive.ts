/**
 * The Tinyburg OAuth server, wired to this app's users, sessions and clients.
 *
 * `@yielded/auth` owns the protocol: authorization, consent, codes, tokens,
 * refresh rotation, revocation, discovery and the JWKS (`./oauthServer.ts`
 * declares it). What it asks of the application is answered here, from the
 * tables Tinyburg already has:
 *
 * - who is signed in, from the provider session cookie (`Identity`);
 * - which clients exist, from `oauth_clients` (`Clients`);
 * - which of the requested scopes a client may hold (`Authorization`);
 * - what the consent screen looks like (`ConsentRenderer`).
 *
 * Grants are stored by `@yielded/auth-persistence` in the tables migration
 * 0015 created, on the app's own Postgres pool.
 */

import type { SqlError } from "effect/sql";

import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { OAuthClient } from "../domain/models.ts";
import type { Language } from "@tinyburg/shared-ui/Internationalization";

import { OAuthServerPersistence } from "@yielded/auth-persistence";
import * as OAuthServer from "@yielded/auth/OAuthServer";
import { SubjectId } from "@yielded/auth/Schema";

import { DevelopersRepository } from "../domain/developers.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { UsersRepository } from "../domain/users.ts";
import { CookiePolicy, maybeCurrentUser } from "./cookies.ts";
import { OidcKeys } from "./keys.ts";
import {
    DECLARED_SCOPES,
    MAX_DECLARED_SCOPE_LENGTH,
    OFFLINE_ACCESS,
    TinyburgOAuth,
    apiResourceFor,
    firstPartyRedirectUriFor,
} from "./oauthServer.ts";
import * as ConsentPage from "./pages/consent.ts";

/** The scopes in a space-separated scope string, as `oauth_clients.scope` stores them. */
export const scopesOf = (scope: string): ReadonlyArray<string> => scope.split(" ").filter((part) => part.length > 0);

/**
 * The language the consent screen renders in. The OAuth server renders consent
 * without handing over the request, so the route that calls into it reads the
 * visitor's `Accept-Language` and provides it here for the renderer to find.
 */
export const ConsentLanguage = Context.Reference<Language>("@tinyburg/tinyburg.app/server/ConsentLanguage", {
    defaultValue: () => "en",
});

const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

/**
 * The grant types a client registered for `scope` may use. Refresh tokens go
 * to clients registered with `offline_access` and to nobody else, so they
 * follow from the registered scope rather than being stored beside it.
 */
export const grantTypesFor = (scope: string): ReadonlyArray<"authorization_code" | "refresh_token"> =>
    scopesOf(scope).includes(OFFLINE_ACCESS) ? ["authorization_code", "refresh_token"] : ["authorization_code"];

/**
 * A stored client as the OAuth server registers it, with absent fields
 * omitted: the server refuses a registration carrying keys it does not know
 * or values it cannot use.
 *
 * The first party's redirect uri is the one exception to the row: it is
 * derived from the site's own origin (`firstPartyRedirectUriFor`), because
 * `/auth/token` derives the same one to match it, and a row cannot follow
 * `SITE_URL` from one deployment to the next.
 */
const registrationOf = (row: OAuthClient, issuer: string) => ({
    clientId: row.id,
    name: row.name,
    redirectUris:
        row.id === DevelopersRepository.FIRST_PARTY_CLIENT_ID
            ? [firstPartyRedirectUriFor(issuer)]
            : [...row.redirectUris],
    grantTypes: grantTypesFor(row.scope),
    ...Option.match(row.secretHash, {
        onNone: () => ({}),
        // The server compares against unpadded base64url; tolerate a digest
        // that was stored with its padding.
        onSome: (hash) => ({ clientSecretDigest: hash.replace(/=+$/, "") }),
    }),
});

/**
 * A client as both halves of the provider see it: the registration the OAuth
 * server works from, and the scopes it is registered for. None for an id that
 * is not a client, and for a row the OAuth server could not use (a redirect
 * uri that is neither https nor loopback, say), which is then as unknown to
 * the consent screen as it is to the token endpoint.
 */
export const registeredClient = (
    clientId: string
): Effect.Effect<
    Option.Option<{ readonly registration: OAuthServer.Client; readonly scopes: ReadonlySet<string> }>,
    SqlError.SqlError | Schema.SchemaError,
    DevelopersRepository | OidcKeys
> =>
    Effect.gen(function* () {
        // Anything else would reach Postgres as a failed uuid cast, which
        // reads as an outage rather than as a client that does not exist.
        if (!isUuid(clientId)) return Option.none();

        const row = yield* DevelopersRepository.use((repo) => repo.findOAuthClient(clientId));
        if (Option.isNone(row)) return Option.none();

        const { issuer } = yield* OidcKeys;
        const registration = registrationOf(row.value, issuer);
        if (!Schema.is(OAuthServer.Client)(registration)) {
            yield* Effect.logWarning(`oauth client ${clientId} is not a registration the OAuth server can use`);
            return Option.none();
        }

        return Option.some({ registration, scopes: new Set(scopesOf(row.value.scope)) });
    });

/**
 * The visitor, as the OAuth server asks after them.
 *
 * Signed in means the provider session cookie, the same one every other page
 * reads. The subject is the user's id, which is what every relying party
 * already knows them by.
 *
 * A grant stays good for as long as its user exists: signing out of
 * tinyburg.app ends the session, not the access the visitor gave other
 * applications. The OAuth server still ends every grant when the session it
 * was given in would have expired.
 */
const IdentityLive = Layer.effect(
    TinyburgOAuth.Identity,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;
        const users = yield* UsersRepository;

        return TinyburgOAuth.Identity.of({
            current: Effect.gen(function* () {
                const current = yield* maybeCurrentUser;
                if (Option.isNone(current)) return undefined;
                const { session, user } = current.value;

                // A session is created at sign in and never extended, so its
                // creation is when the visitor authenticated.
                return {
                    subjectId: yield* Schema.decodeEffect(SubjectId)(user.id),
                    sessionId: session.id,
                    securityRevision: "1",
                    authenticatedAtMillis: DateTime.toEpochMillis(session.createdAt),
                    expiresAtMillis: DateTime.toEpochMillis(session.expiresAt),
                };
            }).pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(CookiePolicy, cookiePolicy),
                Effect.mapError(() => OAuthServer.Unavailable.make({}))
            ),

            active: ({ subjectId }) =>
                users.findUserById(subjectId).pipe(
                    Effect.map(Option.isSome),
                    Effect.mapError(() => OAuthServer.Unavailable.make({}))
                ),

            profile: ({ subjectId }) =>
                users.findUserById(subjectId).pipe(
                    Effect.map((user) => {
                        const name = Option.match(user, { onNone: () => "", onSome: (found) => found.displayName });
                        return name.length === 0 ? {} : { name: name.slice(0, 256) };
                    }),
                    Effect.mapError(() => OAuthServer.Unavailable.make({}))
                ),
        });
    })
);

/** Every client is a row of `oauth_clients`; there are no static registrations. */
const ClientsLive = Layer.effect(
    TinyburgOAuth.Clients,
    Effect.gen(function* () {
        const developers = yield* DevelopersRepository;
        const keys = yield* OidcKeys;

        return TinyburgOAuth.Clients.of({
            get: (clientId) =>
                registeredClient(clientId).pipe(
                    Effect.provideService(DevelopersRepository, developers),
                    Effect.provideService(OidcKeys, keys),
                    Effect.map(Option.match({ onNone: () => undefined, onSome: ({ registration }) => registration })),
                    Effect.mapError(() => OAuthServer.Unavailable.make({}))
                ),
        });
    })
);

/**
 * Which of the requested scopes a client may hold: the ones it is registered
 * for. Asked again on every refresh, so narrowing a client's registration
 * narrows the grants it already has. The server hands a refresh token to every
 * client registered for `offline_access`, so a refresh is refused unless the
 * visitor actually consented to `offline_access` for this grant.
 */
const AuthorizationLive = Layer.effect(
    TinyburgOAuth.Authorization,
    Effect.gen(function* () {
        const developers = yield* DevelopersRepository;
        const keys = yield* OidcKeys;

        return TinyburgOAuth.Authorization.of({
            authorize: ({ clientId, grantType, scopes }) =>
                grantType === "refresh_token" && !scopes.includes(OFFLINE_ACCESS)
                    ? Effect.succeed({ scopes: [] })
                    : registeredClient(clientId).pipe(
                          Effect.provideService(DevelopersRepository, developers),
                          Effect.provideService(OidcKeys, keys),
                          Effect.map(
                              Option.match({
                                  onNone: () => ({ scopes: [] }),
                                  onSome: (client) => ({ scopes: scopes.filter((scope) => client.scopes.has(scope)) }),
                              })
                          ),
                          Effect.mapError(() => OAuthServer.Unavailable.make({}))
                      ),
        });
    })
);

/** The consent screen, in the visitor's language (`ConsentLanguage`). */
const ConsentRendererLive = Layer.succeed(
    OAuthServer.ConsentRenderer,
    OAuthServer.ConsentRenderer.of({
        render: (consent) =>
            Effect.flatMap(ConsentLanguage, (language) => ConsentPage.render(ConsentPage.modelFor(consent, language))),
    })
);

/**
 * Every third party asks permission on every authorization; consent is never
 * remembered. The first party is the app the visitor is already using, so
 * prompting it to authorize itself would be noise.
 */
const OpenIdConsentLive = Layer.succeed(
    OAuthServer.OpenIdConsent,
    OAuthServer.OpenIdConsent.of({
        approved: ({ clientId }) => Effect.succeed(clientId === DevelopersRepository.FIRST_PARTY_CLIENT_ID),
    })
);

/**
 * The OAuth server itself.
 *
 * Its origin is the site's own, so every endpoint and the issuer agree with
 * what the browser and the relying parties see. Sign in happens at
 * `/oauth/login`, which hands over to the app's own login page
 * (`./routes/oidc.ts`). Refresh tokens are on for the clients registered for
 * `offline_access`.
 *
 * Access tokens are RS256 JWTs (RFC 9068) for one resource, the api under
 * `/v1` (`apiResourceFor`), signed with the same key as ID tokens and
 * published in the same JWKS. This server still checks each one against its
 * grant, so revoking a grant ends its tokens here at once; the treasury,
 * behind `/v1/treasury`, verifies them against the JWKS alone.
 *
 * The server refuses JWT access tokens when the declared scopes, joined, are
 * longer than {@link MAX_DECLARED_SCOPE_LENGTH}; that refusal is an anonymous
 * configuration error, so the length is checked first and named here.
 */
export const OAuthServerLive = Layer.unwrap(
    Effect.gen(function* () {
        const keys = yield* OidcKeys;

        if (DECLARED_SCOPES.length > MAX_DECLARED_SCOPE_LENGTH) {
            return yield* Effect.die(
                new Error(
                    `the declared scopes join to ${DECLARED_SCOPES.length} characters, ` +
                        `past the ${MAX_DECLARED_SCOPE_LENGTH} JWT access tokens allow`
                )
            );
        }

        return TinyburgOAuth.layer({
            origin: keys.issuer,
            resource: apiResourceFor(keys.issuer),
            accessTokenFormat: "jwt",
            clients: [],
            loginPath: "/oauth/login",
            keys: keys.signingKeys,
            identityKeys: keys.identityKeys,
            refreshTokens: true,
        });
    })
).pipe(
    Layer.provide([
        IdentityLive,
        ClientsLive,
        AuthorizationLive,
        ConsentRendererLive,
        OpenIdConsentLive,
        OAuthServerPersistence.layer,
    ])
);

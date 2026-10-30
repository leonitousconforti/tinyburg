import { DateTime, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import type { RegistrationPolicy } from "../environment.ts";

import * as OAuthServer from "@yielded/auth/OAuthServer";

import { DevelopersRepository } from "../../domain/developers.ts";
import { randomSecret, sha256, timingSafeEquals } from "../crypto.ts";
import { registrationPolicy } from "../environment.ts";
import { grantTypesFor, scopesOf } from "../oauthLive.ts";
import { SUPPORTED_SCOPES } from "../oauthServer.ts";

/**
 * Dynamic client registration, RFC 7591.
 *
 * Who may register is the `registrationPolicy` in `../environment.ts`: open
 * in development, where the only clients are the services next door in the
 * dev stack; gated by an initial access token (RFC 7591 Section 3) when a
 * deployment sets `REGISTRATION_TOKEN`; and absent otherwise, routes
 * unmounted and nothing advertised in discovery, because an open endpoint
 * lets anyone mint a client and put a consent screen in front of users under
 * this provider's name.
 *
 * The OAuth server offers no registration of its own, so this is the
 * provider's own, and what it accepts is held to what the OAuth server can
 * use: a registration it would refuse to load later is refused here instead.
 * Registration is idempotent, keyed by the `software_id` the client sends, so
 * registering again under one updates that client instead of making another.
 * That is what lets a service register on every boot and hold no record of
 * its own registration - the provider recognizes it. There is no RFC 7592
 * endpoint for the same reason: nothing needs to read a registration back
 * that it can simply make again.
 */

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

const AuthMethod = Schema.Literals(["none", "client_secret_basic", "client_secret_post"]);

/** The client metadata this provider understands, RFC 7591 Section 2. Anything else is ignored. */
const ClientMetadataRequest = Schema.Struct({
    redirect_uris: Schema.NonEmptyArray(Schema.String).check(Schema.isMaxLength(16)),
    client_name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(256)),
    // RFC 7591 Section 2: absent means `client_secret_basic`.
    token_endpoint_auth_method: Schema.optionalKey(AuthMethod),
    grant_types: Schema.optionalKey(Schema.Array(Schema.Literals(["authorization_code", "refresh_token"]))),
    response_types: Schema.optionalKey(Schema.Tuple([Schema.Literal("code")])),
    scope: Schema.optionalKey(Schema.String),
    // RFC 7591 leaves `software_id` optional, but this provider registers by
    // it: without one there is nothing to recognize the client by on its next
    // boot, and it would collect a new registration every time it started.
    software_id: Schema.String.check(Schema.isMinLength(1)),
});

/** The redirect uris the OAuth server accepts: https, or http on loopback, and at most sixteen. */
const isRedirectUris = Schema.is(OAuthServer.Client.fields.redirectUris);

const supported: ReadonlySet<string> = new Set(SUPPORTED_SCOPES);

const refuse = (error: "invalid_client_metadata" | "invalid_redirect_uri") =>
    HttpServerResponse.json({ error }, { status: 400, headers: noStore });

const unauthorized = HttpServerResponse.empty({ status: 401, headers: { "www-authenticate": "Bearer", ...noStore } });

/** The bearer token on the current request, if it carries one. */
const presentedBearer = Effect.map(HttpServerRequest.HttpServerRequest, (request) =>
    Option.fromNullishOr(request.headers["authorization"]).pipe(
        Option.filter((value) => value.startsWith("Bearer ")),
        Option.map((value) => value.slice("Bearer ".length))
    )
);

/**
 * Whether the request presents the initial access token the policy demands.
 * Compared as hashes so the comparison is constant-time over equal lengths
 * and never over the token itself.
 */
const presentsInitialAccessToken = (
    expected: Redacted.Redacted
): Effect.Effect<boolean, never, HttpServerRequest.HttpServerRequest> =>
    Effect.gen(function* () {
        const bearer = yield* presentedBearer;
        if (Option.isNone(bearer)) return false;
        const [presented, required] = yield* Effect.all([sha256(bearer.value), sha256(Redacted.value(expected))]);
        return timingSafeEquals(presented, required);
    });

// POST /oauth/register - RFC 7591 Section 3.1. Idempotent per `software_id`:
// registering again updates that client rather than making another, so a
// service can do this on every boot and keep nothing of its own.
const register = (policy: RegistrationPolicy) =>
    Effect.gen(function* () {
        // RFC 7591 Section 3: outside development, registering takes the initial
        // access token the operator handed out. Refused the same way an unknown
        // client is, so the endpoint reveals nothing about whether one is set.
        if (Option.isSome(policy.initialAccessToken)) {
            if (!(yield* presentsInitialAccessToken(policy.initialAccessToken.value))) return unauthorized;
        }

        const decoded = yield* HttpServerRequest.schemaBodyJson(ClientMetadataRequest).pipe(Effect.option);
        if (Option.isNone(decoded)) return yield* refuse("invalid_client_metadata");
        const metadata = decoded.value;

        if (!isRedirectUris(metadata.redirect_uris)) return yield* refuse("invalid_redirect_uri");

        // Every client signs its user in; one that cannot use the code grant
        // could never get a token at all.
        if (metadata.grant_types !== undefined && !metadata.grant_types.includes("authorization_code")) {
            return yield* refuse("invalid_client_metadata");
        }

        const requested = [...new Set(scopesOf(metadata.scope ?? "openid profile"))];
        if (requested.length === 0 || !requested.every((scope) => supported.has(scope))) {
            return yield* refuse("invalid_client_metadata");
        }
        const scope = requested.join(" ");

        // A confidential client gets a secret minted for it; a public one proves
        // itself with PKCE and gets none. Only the hash is stored, so this
        // response is the one time the secret is visible - and registering
        // again replaces it, which is why the client is told it every time
        // rather than being expected to have kept the last one.
        const authMethod = metadata.token_endpoint_auth_method ?? "client_secret_basic";
        const clientSecret = authMethod === "none" ? Option.none<string>() : Option.some(randomSecret());
        const secretHash = yield* Option.match(clientSecret, {
            onNone: () => Effect.succeedNone,
            onSome: (secret) => Effect.asSome(sha256(secret)),
        });

        const client = yield* DevelopersRepository.use((repo) =>
            repo.registerOAuthClient({
                softwareId: metadata.software_id,
                name: metadata.client_name,
                secretHash: Option.getOrNull(secretHash),
                scope,
                redirectUris: metadata.redirect_uris,
            })
        );

        // RFC 7591 Section 3.2.1. The grant types are the ones this client
        // will actually be issued, which follow from its scope rather than
        // from what it asked for.
        return yield* HttpServerResponse.json(
            {
                client_id: client.id,
                ...Option.match(clientSecret, {
                    onNone: () => ({}),
                    onSome: (secret) => ({ client_secret: secret, client_secret_expires_at: 0 }),
                }),
                client_id_issued_at: Math.floor(DateTime.toEpochMillis(client.createdAt) / 1000),
                redirect_uris: client.redirectUris,
                client_name: client.name,
                token_endpoint_auth_method: authMethod,
                grant_types: grantTypesFor(client.scope),
                response_types: ["code"],
                scope: client.scope,
                software_id: metadata.software_id,
            },
            { status: 201, headers: noStore }
        );
    });

/** The registration endpoint, mounted only where the policy offers registration. */
const routesFor = (policy: RegistrationPolicy) => HttpRouter.add("POST", "/oauth/register", register(policy));

export const DynamicRegistrationLive = Layer.unwrap(
    Effect.map(registrationPolicy, (policy): ReturnType<typeof routesFor> =>
        policy.offered ? routesFor(policy) : Layer.empty
    )
);

import { Effect, Layer, Option, Redacted, Result } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import type { RegistrationPolicy } from "../environment.ts";

import { DynamicClientRegistration } from "effect-oidc";

import { DevelopersRepository } from "../../domain/developers.ts";
import { randomSecret, sha256 } from "../crypto.ts";
import { registrationPolicy } from "../environment.ts";
import { SUPPORTED_SCOPES, noStore, timingSafeEquals } from "./oidc.ts";

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
 * What a registration may say is `effect-oidc`'s business:
 * `DynamicClientRegistration.validateClientMetadata` fills in the RFC's
 * defaults and refuses anything this provider could not honour later, under
 * the policy below. What is this provider's own is the storage: registration
 * is idempotent, keyed by the `software_id` the client sends, so registering
 * again under one updates that client instead of making another. That is what
 * lets a service register on every boot and hold no record of its own
 * registration - the provider recognizes it. There is no RFC 7592 endpoint for
 * the same reason: nothing needs to read a registration back that it can
 * simply make again.
 */

const metadataPolicy: DynamicClientRegistration.RegistrationPolicy = {
    supportedScopes: SUPPORTED_SCOPES,
    defaultScope: "openid profile",
    // RFC 7591 leaves `software_id` optional, but this provider registers by
    // it: without one there is nothing to recognize the client by on its next
    // boot, and it would collect a new registration every time it started.
    requireSoftwareId: true,
};

const refuse = (error: DynamicClientRegistration.RegistrationErrorCode) =>
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

        const decoded = yield* HttpServerRequest.schemaBodyJson(
            DynamicClientRegistration.ClientMetadataRequestSchema
        ).pipe(Effect.option);
        if (Option.isNone(decoded)) return yield* refuse("invalid_client_metadata");
        const validated = DynamicClientRegistration.validateClientMetadata(decoded.value, metadataPolicy);
        if (Result.isFailure(validated)) return yield* refuse(validated.failure);
        const metadata = validated.success;

        // `requireSoftwareId` above guarantees this is present; the type does
        // not know that, and a refusal is cheaper than an assertion.
        const softwareId = metadata.softwareId;
        if (Option.isNone(softwareId)) return yield* refuse("invalid_client_metadata");

        // A confidential client gets a secret minted for it; a public one proves
        // itself with PKCE and gets none. Only the hash is stored, so this
        // response is the one time the secret is visible - and registering
        // again replaces it, which is why the client is told it every time
        // rather than being expected to have kept the last one.
        const clientSecret = metadata.confidential ? Option.some(randomSecret()) : Option.none<string>();
        const secretHash = yield* Option.match(clientSecret, {
            onNone: () => Effect.succeedNone,
            onSome: (secret) => Effect.map(sha256(secret), Option.some),
        });

        const client = yield* DevelopersRepository.use((repo) =>
            repo.registerOAuthClient({
                softwareId: softwareId.value,
                name: metadata.clientName,
                secretHash: Option.getOrNull(secretHash),
                scope: metadata.scope,
                redirectUris: metadata.redirectUris,
            })
        );

        return yield* HttpServerResponse.json(
            DynamicClientRegistration.clientInformationResponse({
                clientId: client.id,
                metadata,
                clientSecret: Option.getOrUndefined(clientSecret),
                issuedAt: client.createdAt,
            }),
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

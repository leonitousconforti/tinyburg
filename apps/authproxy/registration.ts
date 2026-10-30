import { Effect, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

/**
 * Why registering failed. `Unreachable` is no answer, or a server error, from
 * the provider, which is worth retrying; the rest are final: `Refused` is any
 * other non-success answer, `Unsupported` a provider that advertises no
 * registration endpoint, and `InvalidResponse` an answer that is not what RFC
 * 7591 says it should be.
 */
export class RegistrationError extends Schema.TaggedError<RegistrationError, { readonly brand: unique symbol }>()(
    "RegistrationError",
    {
        reason: Schema.Literals(["Unreachable", "Unsupported", "Refused", "InvalidResponse"]),
    }
) {}

/** The client metadata a registration sends, RFC 7591 Section 2, as it goes on the wire. */
export interface ClientMetadata {
    readonly software_id: string;
    readonly client_name: string;
    readonly redirect_uris: ReadonlyArray<string>;
    readonly token_endpoint_auth_method: "none" | "client_secret_basic" | "client_secret_post";
    readonly grant_types: ReadonlyArray<"authorization_code" | "refresh_token">;
    readonly scope: string;
}

/** The part of the provider's discovery document registering needs. */
const Discovery = Schema.Struct({
    issuer: Schema.String,
    registration_endpoint: Schema.optional(Schema.String),
});

/** The part of the RFC 7591 Section 3.2.1 response a client keeps. */
const ClientInformation = Schema.Struct({
    client_id: Schema.NonEmptyString,
    client_secret: Schema.optional(Schema.NonEmptyString),
});

const send = (request: HttpClientRequest.HttpClientRequest) =>
    HttpClient.execute(request).pipe(
        Effect.mapError(() => new RegistrationError({ reason: "Unreachable" })),
        Effect.flatMap((response) =>
            response.status >= 500
                ? Effect.fail(new RegistrationError({ reason: "Unreachable" }))
                : response.status >= 300
                  ? Effect.fail(new RegistrationError({ reason: "Refused" }))
                  : Effect.succeed(response)
        )
    );

const decode =
    <S extends Schema.Constraint>(schema: S) =>
    (response: HttpClientResponse.HttpClientResponse) =>
        HttpClientResponse.schemaBodyJson(schema)(response).pipe(
            Effect.mapError(() => new RegistrationError({ reason: "InvalidResponse" }))
        );

/**
 * Registers a client at an OpenID provider, RFC 7591, which `@yielded/oauth`
 * leaves to the application. The registration endpoint is read from the
 * provider's discovery document, whose issuer must be exactly `issuer`, and
 * the initial access token, when there is one, rides as a bearer token
 * (Section 3). The secret is only there for a confidential client.
 */
export const register = Effect.fnUntraced(function* (
    issuer: string,
    options: {
        readonly initialAccessToken: Redacted.Redacted<string> | undefined;
        readonly metadata: ClientMetadata;
    }
) {
    const discovery = yield* send(
        HttpClientRequest.get(`${issuer}/.well-known/openid-configuration`).pipe(HttpClientRequest.acceptJson)
    ).pipe(Effect.flatMap(decode(Discovery)));

    if (discovery.issuer !== issuer) return yield* new RegistrationError({ reason: "InvalidResponse" });
    if (discovery.registration_endpoint === undefined) {
        return yield* new RegistrationError({ reason: "Unsupported" });
    }

    const request = HttpClientRequest.post(discovery.registration_endpoint).pipe(
        HttpClientRequest.acceptJson,
        HttpClientRequest.bodyJsonUnsafe(options.metadata)
    );

    const information = yield* send(
        options.initialAccessToken === undefined
            ? request
            : HttpClientRequest.bearerToken(request, options.initialAccessToken)
    ).pipe(Effect.flatMap(decode(ClientInformation)));

    return {
        clientId: information.client_id,
        clientSecret: Option.fromUndefinedOr(information.client_secret).pipe(
            Option.map((secret) => Redacted.make(secret))
        ),
    };
});

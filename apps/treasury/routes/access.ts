/**
 * Who may call the treasury's api, and as whom.
 *
 * Every caller holds a JWT access token tinyburg.app issued for the Tinyburg
 * api (`<site>/v1`): the first-party app gets one from tinyburg.app's
 * `/auth/token`, any other application uses the one it was issued, and
 * tinyburg.app's `/v1/treasury` proxy forwards it here untouched. The
 * treasury checks it locally against the provider's published keys - issuer,
 * audience, `at+jwt`, lifetime - and holds no keys or sessions of its own, so
 * a token minted anywhere but tinyburg.app verifies nowhere here.
 *
 * Authorization is the endpoint's `OAuthScope.Required` annotation from the
 * treasury-sdk (the group's when the endpoint has none), checked the way the
 * Tinyburg OAuth server checks its own: every guarded endpoint names a leaf
 * of the `treasury` area, so only treasury scopes ever open anything here,
 * whatever else the token carries. The token's other scopes are tinyburg.app's
 * business; refusing them outright would refuse every token an application
 * also uses for the rest of the api, the first party's included.
 *
 * Local verification means a revoked grant's token keeps working here until
 * it expires, ten minutes at most. That is the accepted trade-off: anything
 * the treasury then does to a trader's tower goes through tinyburg.app's
 * `/v1` with the treasury's own grant, where revocation is immediate.
 */

import { Context, Effect, Layer, Redacted } from "effect";
import { HttpEffect, HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";

import * as NimblebitScopes from "@tinyburg/nimblebit-sdk/NimblebitScopes";
import * as OAuthScope from "@yielded/auth/OAuthScope";
import * as OAuthServer from "@yielded/auth/OAuthServer";
import * as Jwks from "@yielded/jose/Jwks";

import { TinyburgProvider } from "../services/provider.ts";

/** Who an api request acts for: the user, and the application acting for them. */
export interface Trader {
    readonly userId: string;
    readonly clientId: string;
}

/**
 * The caller of the api request being handled, set by {@link RequireAccessLive}.
 * `undefined` outside a guarded endpoint.
 */
export const CurrentTrader = Context.Reference<Trader | undefined>("@tinyburg/treasury/routes/CurrentTrader", {
    defaultValue: () => undefined,
});

/**
 * The current caller. A guarded handler always has one, so its absence is a
 * wiring bug rather than a client error, and dies.
 */
export const requireTrader: Effect.Effect<Trader> = Effect.gen(function* () {
    const trader = yield* CurrentTrader;
    if (trader === undefined) return yield* Effect.die(new Error("requireTrader ran outside a RequireAccess endpoint"));
    return trader;
});

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

/**
 * RFC 9728's metadata url for a resource: the well-known prefix inserted
 * before its path, so `<site>/v1` is described at
 * `<site>/.well-known/oauth-protected-resource/v1`, which tinyburg.app serves.
 */
const resourceMetadataUrl = (resource: string): string => {
    const url = new URL(resource);
    return `${url.origin}/.well-known/oauth-protected-resource${url.pathname === "/" ? "" : url.pathname}`;
};

export const RequireAccessLive = Layer.effect(
    OAuthScope.RequireAccess,
    Effect.gen(function* () {
        const provider = yield* TinyburgProvider;

        // Fetched on first use and cached, so the treasury boots without the
        // keys and a rotation at the provider is picked up on the next miss.
        const keys = Context.get(yield* Layer.build(Jwks.layerRemote({ url: provider.jwksUri })), Jwks.Jwks);
        const verifier = yield* OAuthServer.makeAccessTokenVerifierWithKeySet({
            issuer: provider.issuer,
            resource: provider.resource,
        }).pipe(Effect.provideService(Jwks.Jwks, keys), Effect.orDie);

        const resourceMetadata = resourceMetadataUrl(provider.resource);

        return OAuthScope.RequireAccess.of({
            bearer: Effect.fnUntraced(function* (httpEffect, { credential, endpoint, group }) {
                const requirement =
                    Context.getOrUndefined(endpoint.annotations, OAuthScope.Required) ??
                    Context.getOrUndefined(group.annotations, OAuthScope.Required);

                // Every guarded endpoint in the sdk carries a requirement, at
                // least through its group, so this is a wiring bug and nothing
                // the caller can fix.
                if (requirement === undefined) {
                    yield* Effect.logError(
                        `${group.identifier}.${endpoint.name} is guarded without a scope requirement`
                    );
                    return yield* new HttpApiError.ServiceUnavailable();
                }

                // The challenge advertises every `allOf` scope and the first
                // `anyOf` one, the narrowest alternative, as the OAuth server's
                // own challenges do.
                const advertised = [...(requirement.allOf ?? []), ...(requirement.anyOf ?? []).slice(0, 1)]
                    .map(NimblebitScopes.entryName)
                    .join(" ");

                const deny = (
                    error: HttpApiError.Unauthorized | HttpApiError.Forbidden,
                    reason?: "invalid_token" | "insufficient_scope"
                ) =>
                    HttpEffect.appendPreResponseHandler((_request, response) =>
                        Effect.succeed(
                            HttpServerResponse.setHeaders(response, {
                                ...noStore,
                                "www-authenticate": `Bearer resource_metadata="${resourceMetadata}", scope="${advertised}"${reason === undefined ? "" : `, error="${reason}"`}`,
                            })
                        )
                    ).pipe(Effect.andThen(Effect.fail(error)));

                if (Redacted.value(credential) === "") return yield* deny(new HttpApiError.Unauthorized());

                const verified = yield* verifier.verify(credential).pipe(
                    Effect.timeout("30 seconds"),
                    Effect.map((access) => ({ _tag: "Verified", access }) as const),
                    Effect.catchTag("OAuthServerInvalidToken", () => Effect.succeed({ _tag: "Invalid" } as const)),
                    // The keys could not be fetched or the check could not run:
                    // nothing the caller did, and nothing to challenge them over.
                    Effect.catchCause((cause) =>
                        Effect.as(Effect.logWarning("could not verify a bearer token", cause), {
                            _tag: "Unavailable",
                        } as const)
                    )
                );

                if (verified._tag === "Invalid") {
                    return yield* deny(new HttpApiError.Unauthorized(), "invalid_token");
                }
                if (verified._tag === "Unavailable") return yield* new HttpApiError.ServiceUnavailable();

                const held: ReadonlySet<string> = new Set(verified.access.scopes);
                if (!NimblebitScopes.isSatisfied(requirement, held)) {
                    return yield* deny(new HttpApiError.Forbidden(), "insufficient_scope");
                }

                return yield* Effect.provideService(httpEffect, CurrentTrader, {
                    userId: verified.access.subjectId,
                    clientId: verified.access.clientId,
                });
            }),
        });
    })
);

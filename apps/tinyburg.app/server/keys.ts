import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import { Jwt } from "effect-oidc";

/**
 * The provider's signing key and issuer identity. Everything that mints or
 * verifies a Tinyburg token resolves this service rather than threading keys
 * through call sites.
 */
export class OidcKeys extends Context.Service<OidcKeys>()("@tinyburg/tinyburg.app/server/OidcKeys", {
    make: Effect.gen(function* () {
        const issuer = yield* Config.string("SITE_URL").pipe(
            Config.withDefault("https://tinyburg.app"),
            Config.map((url) => url.replace(/\/$/, ""))
        );

        const privateJwk = yield* Effect.flatMap(Config.redacted("OIDC_PRIVATE_JWK"), (jwk) =>
            Schema.decodeEffect(Schema.fromJsonString(Jwt.PrivateJwkSchema))(Redacted.value(jwk))
        );

        const publicJwk = yield* Jwt.toPublicKey(privateJwk);
        const jwks: Schema.Schema.Type<typeof Jwt.JwksSchema> = { keys: [publicJwk] };

        return {
            issuer,
            privateJwk,
            jwks,
        } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, OidcKeys.make);
}

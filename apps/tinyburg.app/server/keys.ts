import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import type * as OAuthServer from "@yielded/auth/OAuthServer";
import type { SessionSigningKeyring } from "@yielded/auth/Sessions";

/**
 * The RSA private key the provider signs ID tokens with, as a JWK. The OAuth
 * server signs RS256 only, and names the key by `kid` in its JWKS, so both
 * are demanded here rather than discovered at the first sign in.
 */
const RsaPrivateJwk = Schema.Struct({
    kty: Schema.Literal("RSA"),
    n: Schema.NonEmptyString,
    e: Schema.NonEmptyString,
    d: Schema.NonEmptyString,
    p: Schema.NonEmptyString,
    q: Schema.NonEmptyString,
    dp: Schema.NonEmptyString,
    dq: Schema.NonEmptyString,
    qi: Schema.NonEmptyString,
    kid: Schema.NonEmptyString,
});

/**
 * The provider's keys and issuer identity. Everything that mints or verifies
 * a Tinyburg token resolves this service rather than threading keys through
 * call sites.
 *
 * Two keys, for two jobs: `identityKeys` signs the ID tokens clients verify
 * against the published JWKS, and `signingKeys` seals the opaque consent,
 * code, access and refresh credentials only this server ever reads back.
 */
export class OidcKeys extends Context.Service<OidcKeys>()("@tinyburg/tinyburg.app/server/OidcKeys", {
    make: Effect.gen(function* () {
        const issuer = yield* Config.String("SITE_URL").pipe(
            Config.withDefault("https://tinyburg.app"),
            Config.map((url) => url.replace(/\/$/, ""))
        );

        const privateJwk = yield* Effect.flatMap(Config.Redacted("OIDC_PRIVATE_JWK"), (jwk) =>
            Schema.decodeEffect(Schema.fromJsonString(RsaPrivateJwk))(Redacted.value(jwk))
        );

        const identityKeys: OAuthServer.IdentitySigningKeys = {
            activeKeyId: privateJwk.kid,
            privateKey: Redacted.make(privateJwk),
            publicKeys: [
                { kty: "RSA", n: privateJwk.n, e: privateJwk.e, kid: privateJwk.kid, alg: "RS256", use: "sig" },
            ],
        };

        // At least 32 random bytes as base64url, checked by the server when it
        // builds; separate material from anything else, because these seal
        // every bearer credential the provider hands out.
        const signingKeys: SessionSigningKeyring = {
            activeKeyId: "1",
            keys: [{ id: "1", material: yield* Config.Redacted("OAUTH_SIGNING_KEY") }],
        };

        return {
            issuer,
            identityKeys,
            signingKeys,
        } as const;
    }),
}) {
    static readonly Default = Layer.effect(this, OidcKeys.make);
}

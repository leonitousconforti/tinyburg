import { Effect, Encoding, Option, Result } from "effect";

import * as crypto from "node:crypto";

/**
 * Discord signs every interaction it delivers with Ed25519 over
 * `timestamp || rawBody`, and expects a 401 when the signature does not
 * check out. It probes this during endpoint registration: an endpoint that
 * accepts unsigned requests is rejected outright.
 *
 * This is the bot's entire authentication story for inbound traffic. The
 * endpoint is public, so anyone can POST to it; the signature is the only
 * thing separating a real interaction from a forged one claiming to be any
 * Discord user we like. That makes verifying over the *raw* bytes, before
 * anything parses them, load bearing: re-serializing parsed JSON would
 * verify a different string than the one Discord signed.
 */

/**
 * The portal hands out the public key as hex; Node will only take raw
 * Ed25519 key material as a JWK, whose `x` is base64url.
 */
export const parsePublicKey = (publicKeyHex: string): Option.Option<crypto.KeyObject> => {
    const bytes = Encoding.decodeHex(publicKeyHex).pipe(Result.getOrUndefined);
    if (bytes === undefined || bytes.length !== 32) {
        return Option.none();
    }

    try {
        return Option.some(
            crypto.createPublicKey({
                key: { kty: "OKP", crv: "Ed25519", x: Encoding.encodeBase64Url(bytes) },
                format: "jwk",
            })
        );
    } catch {
        return Option.none();
    }
};

/**
 * Whether this body really came from Discord.
 *
 * Never throws and never short-circuits into a truthy value: every failure
 * path, including a malformed signature header, reads as "not verified".
 */
export const verifyInteraction = (options: {
    readonly publicKey: crypto.KeyObject;
    readonly signatureHex: string;
    readonly timestamp: string;
    readonly rawBody: string;
}): Effect.Effect<boolean> =>
    Effect.sync(() => {
        const signature = Encoding.decodeHex(options.signatureHex).pipe(Result.getOrUndefined);
        if (signature === undefined || signature.length !== 64) {
            return false;
        }

        try {
            return crypto.verify(
                null,
                Buffer.from(options.timestamp + options.rawBody, "utf8"),
                options.publicKey,
                signature
            );
        } catch {
            return false;
        }
    });

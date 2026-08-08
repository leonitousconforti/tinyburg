import { Config, Effect, Encoding, Redacted, Schema } from "effect";

import * as crypto from "node:crypto";

/**
 * SHA-256 as base64url, the shape OAuth uses for the PKCE S256 challenge and
 * for anything we keep a hash of rather than the secret itself.
 */
export const sha256 = (value: string): Effect.Effect<string> =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
        (digest) => Encoding.encodeBase64Url(new Uint8Array(digest))
    );

/**
 * A 384-bit random string, for OAuth state and PKCE verifiers.
 */
export const randomSecret = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * The key that protects stored refresh tokens.
 *
 * Refresh tokens cannot be hashed the way session secrets are, because the
 * crawler has to present the original value to the provider months later. They
 * are encrypted instead, so a leaked database dump is not by itself a set of
 * live credentials to other people's towers.
 */
const sealingKey = Config.redacted("GRANT_SEALING_KEY").pipe(
    Config.map((secret) => crypto.createHash("sha256").update(Redacted.value(secret)).digest())
);

const VERSION = "v1";

/**
 * Encrypts a refresh token with AES-256-GCM.
 *
 * The nonce is random per call and stored alongside the ciphertext, so sealing
 * the same token twice produces different output and an attacker learns nothing
 * from comparing rows.
 */
export const seal = (plaintext: string): Effect.Effect<string, Config.ConfigError> =>
    Effect.map(sealingKey, (key) => {
        const nonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
        const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
        return [
            VERSION,
            nonce.toString("base64url"),
            ciphertext.toString("base64url"),
            cipher.getAuthTag().toString("base64url"),
        ].join(".");
    });

/**
 * Reverses {@link seal}.
 *
 * Fails rather than returning garbage when the payload has been tampered with:
 * GCM's auth tag is checked on `final()`, so a modified ciphertext throws.
 */
export const unseal = (sealed: string): Effect.Effect<Redacted.Redacted, Config.ConfigError | SealError> =>
    Effect.flatMap(sealingKey, (key) =>
        Effect.try({
            try: () => {
                const parts = sealed.split(".");
                if (parts.length !== 4 || parts[0] !== VERSION) {
                    throw new Error(`unrecognised sealed value`);
                }
                const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64url"));
                decipher.setAuthTag(Buffer.from(parts[3], "base64url"));
                const plaintext = Buffer.concat([
                    decipher.update(Buffer.from(parts[2], "base64url")),
                    decipher.final(),
                ]);
                return Redacted.make(plaintext.toString("utf8"));
            },
            catch: () => new SealError({}),
        })
    );

/**
 * A sealed value could not be opened, because the key changed or the ciphertext
 * was altered. Deliberately carries no detail: the caller's only correct
 * response is to treat the grant as lost and ask the user to reconnect.
 */
export class SealError extends Schema.ErrorClass<SealError>("@tinyburg/social-circles/SealError")({
    _tag: Schema.tag("SealError"),
}) {}

import { Effect, Encoding } from "effect";

import * as crypto from "node:crypto";

/**
 * SHA-256 as base64url, the shape OAuth uses for the PKCE S256 challenge and
 * for everything we keep a hash of rather than the secret itself: the OAuth
 * state that ties a callback back to the Discord user who started it.
 */
export const sha256 = (value: string): Effect.Effect<string> =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
        (digest) => Encoding.encodeBase64Url(new Uint8Array(digest))
    );

/**
 * A 384-bit random string. Long enough that guessing one is not a strategy,
 * which is what OAuth state and PKCE verifiers both need.
 */
export const randomSecret = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) => byte.toString(16).padStart(2, "0")).join("");

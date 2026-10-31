import { Effect } from "effect";
import { Base64Url } from "effect/encoding";

import * as crypto from "node:crypto";

/**
 * SHA-256 as unpadded base64url, the shape OAuth uses for the PKCE S256
 * challenge and for everything we keep a hash of rather than the secret
 * itself: client secrets and session cookies alike. A client secret's digest
 * in this shape is exactly what the OAuth server compares a presented secret
 * against.
 */
export const sha256 = (value: string): Effect.Effect<string> =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
        (digest) => Base64Url.encode(new Uint8Array(digest))
    );

/**
 * A 384-bit random string. Long enough that guessing one is not a strategy,
 * which is what client secrets and session cookies both need.
 */
export const randomSecret = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * A PKCE code verifier (RFC 7636 Section 4.1): 256 random bits as unpadded
 * base64url, 43 characters, the shortest the RFC allows.
 */
export const codeVerifier = (): string => Base64Url.encode(crypto.getRandomValues(new Uint8Array(32)));

/**
 * Whether two strings are equal, compared in constant time over equal
 * lengths. For digests and other values of a known length, where the length
 * itself gives nothing away.
 */
export const timingSafeEquals = (a: string, b: string): boolean =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

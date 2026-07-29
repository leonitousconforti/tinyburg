import { Effect, Encoding } from "effect";

export const randomStateGenerator = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(48)), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const Sha256CodeChallenge = (verifier: string) =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
        (hashBuffer: ArrayBuffer) => Encoding.encodeBase64Url(new Uint8Array(hashBuffer))
    );

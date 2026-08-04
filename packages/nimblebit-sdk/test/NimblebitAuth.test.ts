import { Crypto, Effect, Layer, Redacted } from "effect";

import { describe, expect, it } from "@effect/vitest";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** A deterministic {@link Crypto} whose `randomBytes` always returns `bytes`. */
const testCrypto = (bytes: ReadonlyArray<number>): Layer.Layer<Crypto.Crypto> =>
    Layer.succeed(
        Crypto.Crypto,
        Crypto.make({
            randomBytes: () => Uint8Array.from(bytes),
            digest: (_algorithm, data) => Effect.succeed(data),
        })
    );

const directAuth = (
    authKey: string,
    bytes: ReadonlyArray<number> = [0, 0, 0, 0]
): Layer.Layer<NimblebitAuth.NimblebitAuth> =>
    NimblebitAuth.layerDirect(NimblebitConfig.NimblebitAuthKeySchema.make(Redacted.make(authKey))).pipe(
        Layer.provide(testCrypto(bytes))
    );

describe("NimblebitAuth.layerDirect", () => {
    it.effect("targets the official Nimblebit sync host", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            expect(auth.host).toBe("https://sync.nimblebit.com");
        }).pipe(Effect.provide(directAuth("test-auth-key")))
    );

    it.effect("signs data as the md5 of the payload concatenated with the auth key", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            // md5("save-data" + "test-auth-key")
            expect(yield* auth.sign("save-data")).toBe("3ea19a2982220d74fbcae3a6244bfad4");
        }).pipe(Effect.provide(directAuth("test-auth-key")))
    );

    it.effect("produces a stable signature for the same input", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            const first = yield* auth.sign("payload");
            const second = yield* auth.sign("payload");
            expect(first).toBe(second);
        }).pipe(Effect.provide(directAuth("test-auth-key")))
    );

    it.effect("produces different signatures for different auth keys", () =>
        Effect.gen(function* () {
            const withKeyA = yield* Effect.provide(
                Effect.flatMap(NimblebitAuth.NimblebitAuth, (auth) => auth.sign("payload")),
                directAuth("key-a")
            );
            const withKeyB = yield* Effect.provide(
                Effect.flatMap(NimblebitAuth.NimblebitAuth, (auth) => auth.sign("payload")),
                directAuth("key-b")
            );
            expect(withKeyA).not.toBe(withKeyB);
        })
    );

    it.effect("reads the salt as a big-endian uint32 from four random bytes", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            expect(yield* auth.salt).toBe(1);
        }).pipe(Effect.provide(directAuth("test-auth-key", [0, 0, 0, 1])))
    );

    it.effect("reads the maximum salt from all-ones bytes", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            expect(yield* auth.salt).toBe(4_294_967_295);
        }).pipe(Effect.provide(directAuth("test-auth-key", [255, 255, 255, 255])))
    );

    it.effect("hands out a burnbot with a valid player id and auth key", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            const burnbot = yield* auth.burnbot;
            expect(["BPQSY", "9GV59", "9GV2Y", "9GTYN"]).toContain(burnbot.playerId);
            expect(Redacted.value(burnbot.playerAuthKey)).toMatch(UUID_PATTERN);
        }).pipe(Effect.provide(directAuth("test-auth-key")))
    );

    it.effect("returns the same burnbot on repeated reads within a layer", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            const first = yield* auth.burnbot;
            const second = yield* auth.burnbot;
            expect(first.playerId).toBe(second.playerId);
        }).pipe(Effect.provide(directAuth("test-auth-key")))
    );
});

describe("NimblebitAuth.layerCustomHost", () => {
    const customAuth = NimblebitAuth.layerCustomHost({
        host: "https://authproxy.tinyburg.app",
        authKey: Redacted.make("proxy-key"),
    }).pipe(Layer.provide(testCrypto([0, 0, 0, 0])));

    it.effect("targets the configured host", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            expect(auth.host).toBe("https://authproxy.tinyburg.app");
        }).pipe(Effect.provide(customAuth))
    );

    it.effect("signs data by base64url encoding it", () =>
        Effect.gen(function* () {
            const auth = yield* NimblebitAuth.NimblebitAuth;
            // base64url("hello") without padding
            expect(yield* auth.sign("hello")).toBe("aGVsbG8");
        }).pipe(Effect.provide(customAuth))
    );
});

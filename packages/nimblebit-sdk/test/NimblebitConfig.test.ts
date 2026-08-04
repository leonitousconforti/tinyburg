import { ConfigProvider, Effect, Exit, Redacted, Schema } from "effect";

import { describe, expect, it } from "@effect/vitest";
import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";

const VALID_AUTH_KEY = "8dad81ae-2626-41b9-8225-325f4809057f";

const withEnv = (env: Record<string, string>) => ConfigProvider.layer(ConfigProvider.fromEnv({ env }));

describe("PlayerIdSchema", () => {
    it.each(["1", "BPQSY", "ABC12", "ZZZZZ"])("accepts the valid player id %s", (id) => {
        expect(Schema.decodeUnknownSync(NimblebitConfig.PlayerIdSchema)(id)).toBe(id);
    });

    it.each([
        ["empty string", ""],
        ["lowercase letters", "abcde"],
        ["more than five characters", "ABCDEF"],
        ["non-alphanumeric characters", "AB!2"],
    ])("rejects %s", (_label, id) => {
        expect(() => Schema.decodeUnknownSync(NimblebitConfig.PlayerIdSchema)(id)).toThrow();
    });
});

describe("PlayerAuthKeySchema", () => {
    it("decodes a redacted UUID into a branded redacted value", () => {
        const decoded = Schema.decodeUnknownSync(NimblebitConfig.PlayerAuthKeySchema)(Redacted.make(VALID_AUTH_KEY));
        expect(Redacted.value(decoded)).toBe(VALID_AUTH_KEY);
    });

    it("rejects a value that is not a UUID", () => {
        expect(() =>
            Schema.decodeUnknownSync(NimblebitConfig.PlayerAuthKeySchema)(Redacted.make("not-a-uuid"))
        ).toThrow();
    });
});

describe("PlayerConfig", () => {
    it.effect("resolves an email-authenticated player", () =>
        Effect.gen(function* () {
            const player = yield* NimblebitConfig.PlayerConfig;
            expect(player.playerId).toBe("AB123");
            expect("playerEmail" in player).toBe(true);
            expect("playerAuthKey" in player).toBe(false);
        }).pipe(Effect.provide(withEnv({ PLAYER_ID: "AB123", PLAYER_EMAIL: "player@example.com" })))
    );

    it.effect("resolves an auth-key-authenticated player", () =>
        Effect.gen(function* () {
            const player = yield* NimblebitConfig.PlayerConfig;
            expect(player.playerId).toBe("AB123");
            expect("playerAuthKey" in player).toBe(true);
            expect("playerEmail" in player).toBe(false);
        }).pipe(Effect.provide(withEnv({ PLAYER_ID: "AB123", PLAYER_AUTH_KEY: VALID_AUTH_KEY })))
    );

    it.effect("fails when both an email and an auth key are provided", () =>
        Effect.gen(function* () {
            const exit = yield* Effect.exit(NimblebitConfig.PlayerConfig);
            expect(Exit.isFailure(exit)).toBe(true);
        }).pipe(
            Effect.provide(
                withEnv({ PLAYER_ID: "AB123", PLAYER_EMAIL: "player@example.com", PLAYER_AUTH_KEY: VALID_AUTH_KEY })
            )
        )
    );

    it.effect("fails when neither an email nor an auth key is provided", () =>
        Effect.gen(function* () {
            const exit = yield* Effect.exit(NimblebitConfig.PlayerConfig);
            expect(Exit.isFailure(exit)).toBe(true);
        }).pipe(Effect.provide(withEnv({ PLAYER_ID: "AB123" })))
    );
});

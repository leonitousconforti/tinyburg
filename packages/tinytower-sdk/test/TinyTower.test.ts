import { Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import * as crypto from "node:crypto";

import { NodeCrypto } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

import { loadSnapshot, snapshotIds } from "./utils/snapshots.ts";

const SECRET = "test-secret";
const PLAYER_AUTH_KEY = "8dad81ae-2626-41b9-8225-325f4809057f";

const player = {
    playerId: NimblebitConfig.PlayerIdSchema.make("ABCDE"),
    playerAuthKey: Schema.decodeSync(NimblebitConfig.PlayerAuthKeySchema)(PLAYER_AUTH_KEY),
};

const md5 = (data: string): string => crypto.createHash("md5").update(data).digest("hex");

interface Seen {
    readonly path: string;
    readonly body: unknown;
}

/**
 * Stands in for sync.nimblebit.com: answers each path with `answer`, and
 * records every request it was sent.
 */
const fakeNimblebit = (answer: (path: string) => unknown, seen: Array<Seen>) =>
    Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request, url) =>
            Effect.sync(() => {
                const body =
                    request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : null;
                seen.push({ path: url.pathname, body });
                return HttpClientResponse.fromWeb(
                    request,
                    new Response(JSON.stringify(answer(url.pathname)), {
                        headers: { "content-type": "application/json" },
                    })
                );
            })
        )
    );

const layer = (answer: (path: string) => unknown, seen: Array<Seen>) =>
    Layer.mergeAll(
        fakeNimblebit(answer, seen),
        NimblebitAuth.layerDirect(Schema.decodeSync(NimblebitConfig.NimblebitAuthKeySchema)(SECRET)).pipe(
            Layer.provide(NodeCrypto.layerSecureRandom)
        )
    );

/** The save version a push sent. Its payload encodes numbers as strings. */
const pushedVersion = (seen: ReadonlyArray<Seen>, pushPath: string): string =>
    Schema.decodeUnknownSync(Schema.Struct({ saveVersion: Schema.String }))(
        seen.find(({ path }) => path.startsWith(pushPath))?.body
    ).saveVersion;

const pushes = [
    ["sync_pushSave", "/sync/push/", TinyTower.sync_pushSave],
    ["sync_pushSnapshot", "/sync/push_snapshot/", TinyTower.sync_pushSnapshot],
] as const;

describe("TinyTower", () => {
    describe.each(pushes)("%s", (_name, pushPath, push) => {
        it.effect("pushes a first save for a player who has none", () =>
            Effect.gen(function* () {
                const data = yield* loadSnapshot(snapshotIds[0]);
                const seen: Array<Seen> = [];
                const answer = (path: string) =>
                    path.startsWith("/sync/current_version/") ? { error: "NoSave" } : { success: "Saved" };

                yield* push({ ...player, data }).pipe(Effect.provide(layer(answer, seen)));

                expect(pushedVersion(seen, pushPath)).toBe(pushPath === "/sync/push/" ? "1" : "0");
            })
        );

        it.effect("builds on the version the server has", () =>
            Effect.gen(function* () {
                const data = yield* loadSnapshot(snapshotIds[0]);
                const seen: Array<Seen> = [];
                // current_version signs its answer with the request's salt
                const answer = (path: string) => {
                    if (!path.startsWith("/sync/current_version/")) return { success: "Saved" };
                    const salt = path.split("/").at(-2);
                    return {
                        success: "Found",
                        id: "7",
                        h: md5(`${player.playerId}${salt}7${PLAYER_AUTH_KEY}${SECRET}`),
                    };
                };

                yield* push({ ...player, data }).pipe(Effect.provide(layer(answer, seen)));

                expect(pushedVersion(seen, pushPath)).toBe(pushPath === "/sync/push/" ? "8" : "7");
            })
        );
    });

    describe("social_pullFriendMeta", () => {
        it.effect("resolves to undefined for a friend Nimblebit has no tower for", () =>
            Effect.gen(function* () {
                const meta = yield* TinyTower.social_pullFriendMeta({
                    ...player,
                    friendId: NimblebitConfig.PlayerIdSchema.make("FGHIJ"),
                }).pipe(Effect.provide(layer(() => ({ success: "Found", meta: {} }), [])));

                expect(meta).toBeUndefined();
            })
        );
    });

    it.effect("device_playerDetails keeps the save version and checksum", () =>
        Effect.gen(function* () {
            const details = yield* TinyTower.device_playerDetails(player).pipe(
                Effect.provide(
                    layer(
                        () => ({
                            success: "Found",
                            player: {
                                player_id: "ABCDE",
                                registered: "0",
                                email: "",
                                blacklisted: "0",
                                saveVersion: "3",
                                h: "2a4d83a3172a5801a1954e7d64a45cbe",
                            },
                        }),
                        []
                    )
                )
            );

            expect(details.saveVersion).toBe(3);
            expect(details.checksum).toBe("2a4d83a3172a5801a1954e7d64a45cbe");
            expect(Redacted.value(details.playerEmail)).toBe("");
        })
    );
});

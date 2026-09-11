/**
 * Seeds the dev stack for the treasury walkthrough.
 *
 * Two users (Alice and Bob), each with a session cookie this script prints
 * and a linked tower, plus a real save pushed to the fake Nimblebit for both
 * towers so the inventory picker and splice trades have something to chew
 * on. Everything is idempotent: run it again and it refreshes the sessions
 * and leaves the rest standing.
 *
 * The saves come from the tinytower-sdk's snapshot corpus, which stores
 * *decoded* saves in vitest's serialization; the reviver below turns one
 * back into a value the SaveData schema can encode. Sign-in stays real
 * everywhere else - the sessions this seeds are exactly what the federated
 * login would have created, minus Google.
 *
 * Usage, with the dev stack (and the fake-nimblebit worker) running:
 *
 *     node apps/treasury/test/seed-dev.ts
 */

import { Config, Effect, Layer, Redacted, Result, Schema, String } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { SqlClient } from "effect/unstable/sql";

import * as fs from "node:fs";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";

import { sha256 } from "../crypto.ts";

/** Stable identities, so re-running refreshes rather than multiplies. */
const USERS = [
    {
        id: "aaaaaaaa-0000-4000-8000-000000000001",
        displayName: "Alice (dev)",
        sessionToken: "alice-dev-session-token",
        playerId: "ALICE",
        authKey: "aaaaaaaa-1111-4111-8111-111111111111",
    },
    {
        id: "bbbbbbbb-0000-4000-8000-000000000002",
        displayName: "Bob (dev)",
        sessionToken: "bob-dev-session-token",
        playerId: "BOBBY",
        authKey: "bbbbbbbb-2222-4222-8222-222222222222",
    },
] as const;

const SNAPSHOT = new URL("../../../packages/tinytower-sdk/test/snapshots/2021331", import.meta.url);

/**
 * A decoded save, recovered from the snapshot corpus. The files are vitest
 * pretty-format output: JS object literals with bare `Date` literals and
 * effect `Result`s flattened to `{ _id, _tag, value | failure }`.
 */
const snapshotSave = Effect.gen(function* () {
    const text = fs.readFileSync(SNAPSHOT, "utf8").replace(/: (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/g, ': new Date("$1")');
    // The corpus is trusted repo content; evaluating it is the entire point.
    // oxlint-disable-next-line typescript/no-implied-eval
    const raw: unknown = Function(`return (${text})`)();

    const revive = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(revive);
        if (value === null || typeof value !== "object" || value instanceof Date) return value;
        // A plain object at this point; the guard above excluded everything else.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const record = value as Record<string, unknown>;
        if (record["_id"] === "Result") {
            return record["_tag"] === "Success"
                ? Result.succeed(revive(record["value"]))
                : Result.fail(revive(record["failure"]));
        }
        return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, revive(entry)]));
    };

    // Round-tripped through the schema so a corpus drift fails loudly here,
    // not as a mystery 400 when the walkthrough pushes it.
    const encoded = yield* Schema.encodeUnknownEffect(TinyTower.SaveData)(revive(raw));
    return yield* Schema.decodeEffect(TinyTower.SaveData)(encoded);
});

const seedDatabase = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    for (const user of USERS) {
        yield* sql`
            INSERT INTO users (id, display_name) VALUES (${user.id}, ${user.displayName})
            ON CONFLICT (id) DO NOTHING
        `;

        const tokenHash = yield* sha256(user.sessionToken);
        yield* sql`
            INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
            VALUES (${user.id}, ${tokenHash}, NOW() + INTERVAL '30 days', 'treasury-seed-script')
            ON CONFLICT (token_hash) DO UPDATE SET expires_at = NOW() + INTERVAL '30 days'
        `;

        yield* sql`
            INSERT INTO tinytower_accounts (user_id, player_id, player_auth_key, player_email)
            VALUES (${user.id}, ${user.playerId}, ${user.authKey}, ${`${user.playerId.toLowerCase()}@fake.invalid`})
            ON CONFLICT (player_id) DO NOTHING
        `;
    }
});

const seedSaves = Effect.gen(function* () {
    const data = yield* snapshotSave;
    for (const user of USERS) {
        const playerId = yield* Schema.decodeUnknownEffect(NimblebitConfig.PlayerIdSchema)(user.playerId);
        const playerAuthKey = yield* Schema.decodeUnknownEffect(NimblebitConfig.PlayerAuthKeySchema)(user.authKey);
        yield* TinyTower.sync_pushSave({ playerId, playerAuthKey, data });
        yield* Effect.logInfo(`pushed a save to the fake for ${user.playerId}`);
    }
});

const program = Effect.gen(function* () {
    yield* seedDatabase;
    yield* seedSaves;

    yield* Effect.log(
        [
            "",
            "Seeded. Paste one cookie per browser profile (dev cookies are unprefixed):",
            ...USERS.map(
                (user) =>
                    `  ${user.displayName}: tinyburg_provider_session=${user.sessionToken}  (tower ${user.playerId})`
            ),
            "",
            "Then open http://localhost:3000/trades in each and follow the walkthrough in apps/treasury/README.md.",
        ].join("\n")
    );
});

const SqlLive = PgClient.layerConfig({
    url: Config.redacted("TINYBURG_APP_DATABASE_URL").pipe(
        Config.withDefault(Redacted.make("postgres://postgres@127.0.0.1:54320/tinyburg_app"))
    ),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

/** The fake does the signing server-side; the bearer key only has to exist. */
const FakeNimblebitLive = NimblebitAuth.layerCustomHostConfig({
    host: Config.string("FAKE_NIMBLEBIT_URL").pipe(Config.withDefault("http://localhost:3005")),
    authKey: Config.redacted("FAKE_NIMBLEBIT_AUTH_KEY").pipe(Config.withDefault(Redacted.make("fake"))),
});

program.pipe(
    Effect.provide(
        Layer.mergeAll(SqlLive, FakeNimblebitLive, FetchHttpClient.layer).pipe(Layer.provideMerge(NodeServices.layer))
    ),
    NodeRuntime.runMain
);

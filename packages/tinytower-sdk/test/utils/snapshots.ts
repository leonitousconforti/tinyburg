/**
 * The snapshot corpus as decoded saves, for tests that need real towers
 * without the network.
 *
 * `schema.test.ts` records each snapshot as vitest's pretty-format output of a
 * decoded save. That output does not escape quotes inside strings, and several
 * saves hold JSON in their raw entries, so it cannot be evaluated as
 * JavaScript. It is read line by line instead, which works because every
 * property and array item sits on its own line. Two things the serializer
 * changed are then undone: effect `Result`s come back from
 * `{ _id, _tag, value | failure }` records, and raw `$unknown` entries, whose
 * keys came out sorted, are put back in file order, which the encoder needs.
 *
 * Every save is encoded and decoded again before use, so drift between the
 * corpus and the schema fails loudly here.
 */

import { Effect, Result, Schema } from "effect";

import * as fs from "node:fs";

import { TinyTower } from "@tinyburg/tinytower-sdk";

const DIRECTORY = new URL("../snapshots/", import.meta.url);

/** The ids of every recorded snapshot, in order. */
export const snapshotIds: ReadonlyArray<string> = fs.readdirSync(DIRECTORY).sort();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

/** Raw entries in the order the save file had them, each run after its head. */
const inFileOrder = (entries: Record<string, unknown>): Record<string, unknown> => {
    const keys = Object.keys(entries);
    const follows = (key: string): unknown => {
        const entry = entries[key];
        return isRecord(entry) && isRecord(entry["$locationMetadata"]) ? entry["$locationMetadata"]["after"] : null;
    };
    const isEntry = (key: unknown): key is string => typeof key === "string" && Object.hasOwn(entries, key);

    const next = new Map<string, string>();
    for (const key of keys) {
        const after = follows(key);
        if (isEntry(after)) next.set(after, key);
    }

    const ordered: Array<string> = [];
    for (const head of keys.filter((key) => !isEntry(follows(key)))) {
        for (let key: string | undefined = head; key !== undefined; key = next.get(key)) ordered.push(key);
    }
    if (ordered.length !== keys.length) throw new Error("Raw entries that only follow each other cannot be ordered");
    return Object.fromEntries(ordered.map((key) => [key, entries[key]]));
};

/** Undoes what the serializer did to one object, once its contents are read. */
const revive = (record: Record<string, unknown>): unknown => {
    if (record["_id"] === "Result") {
        return record["_tag"] === "Success" ? Result.succeed(record["value"]) : Result.fail(record["failure"]);
    }
    const raw = record["$unknown"];
    return isRecord(raw) ? { ...record, $unknown: inFileOrder(raw) } : record;
};

const scalar = (token: string): unknown => {
    if (token === "null") return null;
    if (token === "undefined") return undefined;
    if (token === "true") return true;
    if (token === "false") return false;
    if (/^-?\d+n$/.test(token)) return BigInt(token.slice(0, -1));
    if (ISO_DATE.test(token)) return new Date(token);
    const number = Number(token);
    if (token !== "" && (!Number.isNaN(number) || token === "NaN")) return number;
    throw new Error(`Unrecognised snapshot value: ${token.slice(0, 80)}`);
};

/** Reads pretty-format output: two space indents and a comma after everything. */
export const parseSnapshot = (text: string): unknown => {
    const lines = text.split("\n");
    let cursor = 1;

    const nextLine = (): string => {
        const line = lines[cursor++];
        if (line === undefined) throw new Error("The snapshot ended in the middle of a value");
        return line;
    };

    const string = (start: string): string => {
        if (start.length >= 3 && start.endsWith('",')) return start.slice(1, -2);
        const parts = [start.slice(1)];
        for (let line = nextLine(); ; line = nextLine()) {
            if (line.endsWith('",')) return [...parts, line.slice(0, -2)].join("\n");
            parts.push(line);
        }
    };

    const container = (isObject: boolean, indent: number): unknown => {
        const close = " ".repeat(indent) + (isObject ? "}" : "]");
        const entries: Array<readonly [string, unknown]> = [];
        for (let line = nextLine(); line !== close && line !== `${close},`; line = nextLine()) {
            const content = line.slice(indent + 2);
            const separator = isObject ? content.indexOf('": ') : -1;
            entries.push(
                isObject
                    ? [content.slice(1, separator), value(content.slice(separator + 3), indent + 2)]
                    : [String(entries.length), value(content, indent + 2)]
            );
        }
        return isObject ? revive(Object.fromEntries(entries)) : entries.map(([, item]) => item);
    };

    const value = (start: string, indent: number): unknown => {
        const token = start.endsWith(",") ? start.slice(0, -1) : start;
        if (token === "{" || token === "[") return container(token === "{", indent);
        if (token === "{}") return {};
        if (token === "[]") return [];
        if (start.startsWith('"')) return string(start);
        return scalar(token);
    };

    return value(lines[0] ?? "", 0);
};

/** One snapshot, decoded. */
export const loadSnapshot = Effect.fnUntraced(function* (id: string) {
    const text = fs.readFileSync(new URL(id, DIRECTORY), "utf8");
    const encoded = yield* Schema.encodeUnknownEffect(TinyTower.SaveData)(parseSnapshot(text));
    return yield* Schema.decodeEffect(TinyTower.SaveData)(encoded);
});

/** Every snapshot, decoded, with its id. */
export const loadCorpus = Effect.forEach(snapshotIds, (id) => Effect.map(loadSnapshot(id), (save) => ({ id, save })));

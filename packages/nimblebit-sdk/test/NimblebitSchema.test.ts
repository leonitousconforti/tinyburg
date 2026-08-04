import { Schema } from "effect";

import { describe, expect, it } from "@effect/vitest";
import { NimblebitSchema } from "@tinyburg/nimblebit-sdk";

const decode = <A, I>(schema: Schema.Codec<A, I>) => Schema.decodeUnknownSync(schema);
const encode = <A, I>(schema: Schema.Codec<A, I>) => Schema.encodeUnknownSync(schema);

// The number of C# ticks (100ns intervals since 0001-01-01) at the Unix epoch.
const EPOCH_TICKS = 621_355_968_000_000_000n;

describe("CSharpDate", () => {
    it("decodes the epoch tick count to the Unix epoch", () => {
        const decoded = decode(NimblebitSchema.CSharpDate)(EPOCH_TICKS);
        expect(decoded).toStrictEqual({ date: new Date(0), extraTicks: 0n });
    });

    it("preserves sub-millisecond ticks in extraTicks", () => {
        // 12345 ticks past the epoch = 1ms (10000 ticks) + 2345 remainder ticks.
        const decoded = decode(NimblebitSchema.CSharpDate)(EPOCH_TICKS + 12_345n);
        expect(decoded).toStrictEqual({ date: new Date(1), extraTicks: 2345n });
    });

    it("round trips a decoded value back to the original tick count", () => {
        const ticks = EPOCH_TICKS + 12_345n;
        const decoded = decode(NimblebitSchema.CSharpDate)(ticks);
        expect(encode(NimblebitSchema.CSharpDate)(decoded)).toEqual(ticks);
    });

    it("encodes a plain Date (no extra ticks) to the tick count", () => {
        expect(encode(NimblebitSchema.CSharpDate)(new Date(0))).toEqual(EPOCH_TICKS);
    });
});

describe("UnityColor", () => {
    it("decodes an r:g:b string into a struct", () => {
        expect(decode(NimblebitSchema.UnityColor)("255:128:0")).toStrictEqual({ r: 255, g: 128, b: 0 });
    });

    it("encodes a struct back into an r:g:b string", () => {
        expect(encode(NimblebitSchema.UnityColor)({ r: 255, g: 128, b: 0 })).toEqual("255:128:0");
    });

    it("rejects channel values outside the 0-255 range", () => {
        expect(() => decode(NimblebitSchema.UnityColor)("300:0:0")).toThrow();
    });
});

describe("split", () => {
    const Comma = Schema.String.pipe(NimblebitSchema.split());
    const Pipe = Schema.String.pipe(NimblebitSchema.split({ separator: "|" }));

    it("splits on a comma by default", () => {
        expect(decode(Comma)("a,b,c")).toStrictEqual(["a", "b", "c"]);
    });

    it("joins on a comma when encoding", () => {
        expect(encode(Comma)(["a", "b"])).toEqual("a,b");
    });

    it("honours a custom separator", () => {
        expect(decode(Pipe)("a|b")).toStrictEqual(["a", "b"]);
        expect(encode(Pipe)(["a", "b"])).toEqual("a|b");
    });
});

describe("parseNimblebitObject", () => {
    const Person = Schema.Struct({
        name: Schema.String.annotateKey({ nimblebitSaveDataKey: "n" }),
        level: Schema.NumberFromString.annotateKey({ nimblebitSaveDataKey: "l" }),
    }).pipe(NimblebitSchema.parseNimblebitObject);

    it("decodes bracketed key/value pairs using the save-data keys", () => {
        expect(decode(Person)("[n]Alice[n][l]42[l]")).toStrictEqual({
            name: "Alice",
            level: 42,
            $unknown: {},
        });
    });

    it("encodes back to the bracketed save-data format", () => {
        const decoded = decode(Person)("[n]Alice[n][l]42[l]");
        expect(encode(Person)(decoded)).toEqual("[n]Alice[n][l]42[l]");
    });

    it("captures unrecognised keys in $unknown with their location", () => {
        const decoded = decode(Person)("[n]Bob[n][x]hi[x][l]7[l]");
        expect(decoded).toStrictEqual({
            name: "Bob",
            level: 7,
            $unknown: { x: { value: "hi", $locationMetadata: { after: "name" } } },
        });
    });

    it("round trips unknown keys back into their original position", () => {
        const input = "[n]Bob[n][x]hi[x][l]7[l]";
        expect(encode(Person)(decode(Person)(input))).toEqual(input);
    });
});

describe("parseNimblebitOrderedList", () => {
    const List = NimblebitSchema.parseNimblebitOrderedList([
        { property: "a", schema: Schema.String },
        { property: "b", schema: Schema.String },
    ]);

    it("assigns the leading items to the declared properties", () => {
        expect(decode(List)("11,22")).toStrictEqual({ a: "11", b: "22", $unknown: [] });
    });

    it("collects trailing items into $unknown", () => {
        expect(decode(List)("123,456,789")).toStrictEqual({ a: "123", b: "456", $unknown: ["789"] });
    });

    it("round trips including the overflow items", () => {
        const input = "123,456,789";
        expect(encode(List)(decode(List)(input))).toEqual(input);
    });

    it("fails when there are fewer items than declared properties", () => {
        expect(() => decode(List)("only-one")).toThrow();
    });
});

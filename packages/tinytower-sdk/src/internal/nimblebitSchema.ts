import type { ValidateNimblebitItemSchema } from "../NimblebitSchema.ts";

import * as EffectSchemas from "effect-schemas";
import * as Array from "effect/Array";
import * as Cache from "effect/Cache";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as GlobalValue from "effect/GlobalValue";
import * as HashMap from "effect/HashMap";
import * as Order from "effect/Order";
import * as ParseResult from "effect/ParseResult";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Tuple from "effect/Tuple";

/** @internal */
type Entry = readonly [property: PropertyKey, value: unknown];

/** @internal */
const entryToString = ([property, value]: Entry): string =>
    `[${String(property)}]${String(value)}[${String(property)}]`;

/** @internal */
export const parseNimblebitOrderedList = <
    const Items extends ReadonlyArray<{
        property: PropertyKey;
        schema: Schema.Schema.Any;
    }>,
>(
    items: ValidateNimblebitItemSchema<Items>,
    separator: string | undefined = ","
): Schema.transformOrFail<
    typeof Schema.String,
    Schema.extend<
        Schema.Struct<{
            [K in Items[number]["property"]]: Extract<
                Items[number],
                {
                    property: K;
                }
            >["schema"];
        }>,
        Schema.Struct<{
            $unknown: Schema.Array$<typeof Schema.String>;
        }>
    >,
    Items[number]["schema"]["Context"]
> => {
    const indexesByProperty = Function.pipe(
        items as Items,
        Array.map((item, index) => Tuple.make(item.property, index)),
        HashMap.fromIterable<PropertyKey, number>
    );

    const order = Order.mapInput<Entry, PropertyKey>(Tuple.getFirst)(
        Order.make((a, b) => {
            const aIndex = HashMap.unsafeGet(indexesByProperty, a);
            const bIndex = HashMap.unsafeGet(indexesByProperty, b);
            if (aIndex < bIndex) return -1;
            else if (aIndex > bIndex) return 1;
            else return 0;
        })
    );

    type Fields = { [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] };
    const fieldEntries = Object.fromEntries(items.map((item) => Tuple.make(item.property, item.schema))) as Fields;
    const to = Schema.extend(Schema.Struct(fieldEntries), Schema.Struct({ $unknown: Schema.Array(Schema.String) }));
    const from = Schema.String;

    const transform = Schema.transformOrFail(from, to, {
        // { a: "123", b: "456" } -> "123,456"
        encode: (
            properties: Schema.Schema.Encoded<typeof to>,
            _options,
            ast
        ): Effect.Effect<string, ParseResult.ParseIssue, never> => {
            const allEntries = Object.entries(properties);
            const unknownEntries = properties["$unknown"];
            const knownEntries = Array.filter(allEntries, ([key]) => HashMap.has(indexesByProperty, key));

            if (knownEntries.length + unknownEntries.length < items.length) {
                return ParseResult.fail(
                    new ParseResult.Type(
                        ast,
                        properties,
                        `Expected at least ${items.length} properties, but got ${knownEntries.length + unknownEntries.length}`
                    )
                );
            }

            return Function.pipe(
                knownEntries,
                Array.sort(order),
                Array.map(([_, value]) => String(value)),
                Array.appendAll(unknownEntries),
                Array.join(separator),
                ParseResult.succeed
            );
        },

        // "123,456" -> { a: "123", b: "456" }
        decode: (
            str: string,
            _options,
            ast
        ): Effect.Effect<Schema.Schema.Encoded<typeof to>, ParseResult.ParseIssue, never> => {
            const splitted = str.split(separator);
            if (splitted.length < items.length) {
                return ParseResult.fail(
                    new ParseResult.Type(
                        ast,
                        str,
                        `Expected at least ${items.length} items, but got ${splitted.length}`
                    )
                );
            }

            const unknownProperties = ["$unknown", splitted.slice(items.length)] as const;
            const knownProperties = splitted
                .slice(0, items.length)
                .map((property, index) => [items[index].property, property] as const);

            const properties = [...knownProperties, unknownProperties];
            const obj = Object.fromEntries(properties) as Schema.Schema.Encoded<typeof to>;
            return ParseResult.succeed(obj);
        },
    });

    return transform;
};

/** @internal */
const decodeRegexCache = GlobalValue.globalValue("@tinyburg/tinytower-sdk/NimblebitSchemas/DecodeRegexCache", () =>
    Effect.runSync(
        Cache.make({
            capacity: 200,
            timeToLive: Duration.minutes(10),
            lookup: (key: PropertyKey): Effect.Effect<RegExp, never, never> =>
                Effect.sync(() => new RegExp(`\\[${String(key)}\\]([\\s\\S]*?)\\[${String(key)}\\]`, "m")),
        })
    )
);

/** @internal */
export const parseNimblebitObject = <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>
): Schema.transformOrFail<
    typeof Schema.String,
    Schema.extend<
        Schema.Struct<Fields>,
        Schema.Struct<{
            $unknown: Schema.Record$<
                typeof Schema.String,
                Schema.Struct<{
                    value: typeof Schema.String;
                    $locationMetadata: Schema.Struct<{
                        after: Schema.NullishOr<typeof Schema.String>;
                    }>;
                }>
            >;
        }>
    >,
    never
> => {
    const getPropertyName = (input: readonly [property: PropertyKey, u: unknown]): PropertyKey => {
        if (Schema.isPropertySignature(input[1]) && input[1].ast._tag === "PropertySignatureTransformation") {
            return input[1].ast.from.fromKey ?? input[0];
        } else {
            return input[0];
        }
    };

    const indexesByProperty = Function.pipe(
        Object.entries(struct.fields),
        Array.map((entry, index) => Tuple.make(getPropertyName(entry), index)),
        HashMap.fromIterable<PropertyKey, number>
    );

    const order = Order.mapInput<Entry, PropertyKey>(Tuple.getFirst)(
        Order.make((a, b) => {
            const aIndex = HashMap.unsafeGet(indexesByProperty, a);
            const bIndex = HashMap.unsafeGet(indexesByProperty, b);
            if (aIndex < bIndex) return -1;
            else if (aIndex > bIndex) return 1;
            else return 0;
        })
    );

    const filter = Effect.filter<Entry, never, never>(([key, value]) =>
        Effect.gen(function* () {
            const discard = value === undefined || value === null;
            if (discard) yield* Effect.logTrace(`Discarding property ${String(key)}`);
            return !discard;
        })
    );

    const fieldEntries = Object.entries(struct.fields);
    const from = Schema.String;
    const to = Schema.extend(
        struct,
        Schema.Struct({
            $unknown: Schema.Record({
                key: Schema.String,
                value: Schema.Struct({
                    value: Schema.String,
                    $locationMetadata: Schema.Struct({
                        after: Schema.NullishOr(Schema.String),
                    }),
                }),
            }),
        })
    );

    return Schema.transformOrFail(from, to, {
        // { a: "123", b: "456" } -> "[a]123[a][b]456[b]"
        encode: (
            properties: Schema.Schema.Encoded<typeof to>
        ): Effect.Effect<string, ParseResult.ParseIssue, never> => {
            const { $unknown, ...knownProperties } = properties;

            const unknownPropertiesByAfter = Array.reduce(
                Object.entries($unknown),
                { accumulator: {}, lastAfterInserted: null, lastAfter: null } as {
                    lastAfter: string | null | undefined;
                    lastAfterInserted: string | null | undefined;
                    accumulator: Record<string, Array.NonEmptyReadonlyArray<readonly [string, string]>>;
                },
                ({ accumulator, lastAfter, lastAfterInserted }, [key, { $locationMetadata, value }]) => {
                    const after = $locationMetadata.after ?? "";
                    if (after === lastAfter) {
                        return {
                            lastAfter: key,
                            lastAfterInserted,
                            accumulator: Record.modify(
                                accumulator,
                                lastAfterInserted!,
                                Array.append(Tuple.make(key, value))
                            ),
                        };
                    } else {
                        return {
                            lastAfter: key,
                            lastAfterInserted: after,
                            accumulator: { ...accumulator, [after]: [Tuple.make(key, value)] as const },
                        };
                    }
                }
            ).accumulator;

            return Function.pipe(
                Object.entries(knownProperties),
                Array.sort(order),
                Array.flatMap((entry) => [entry, ...(unknownPropertiesByAfter[String(entry[0])] ?? [])]),
                filter,
                Effect.map(Array.map(entryToString)),
                Effect.map(Array.join(""))
            );
        },

        // "[a]123[a][b]456[b]" -> { a: "123", b: "456" }
        decode: Effect.fnUntraced(function* (
            str: string
        ): Effect.fn.Return<Schema.Schema.Encoded<typeof to>, ParseResult.ParseIssue, never> {
            const outEntries = yield* Effect.forEach(fieldEntries, (field) =>
                Effect.gen(function* () {
                    const key = getPropertyName(field);
                    const matcher = yield* decodeRegexCache.get(key);
                    const match = matcher.exec(str);
                    const value = match ? match[1] : undefined;
                    return Tuple.make(key, value);
                })
            );

            const knownProperties = new Set(outEntries.map(([key]) => key));
            const unknownMatcher = new RegExp(`\\[([^\\]]+)\\]([\\s\\S]*?)\\[\\1\\]`, "gm");
            const unknownEntries: Record<
                string,
                { value: string; $locationMetadata: { after: string | null | undefined } }
            > = {};

            let lastKey: string | null = null;
            let match: RegExpExecArray | null = null;
            while ((match = unknownMatcher.exec(str)) !== null) {
                const key = match[1];
                const value = match[2];
                if (!knownProperties.has(key)) {
                    unknownEntries[key] = {
                        value,
                        $locationMetadata: {
                            after: lastKey,
                        },
                    };
                }
                lastKey = key;
            }

            const allEntries = [...outEntries, ["$unknown", unknownEntries]];
            return Object.fromEntries(allEntries) as Schema.Schema.Encoded<typeof to>;
        }),
    });
};

/** @internal */
export const csharpDate = Schema.transform(
    Schema.BigInt,
    Schema.Union(
        Schema.DateFromSelf,
        Schema.Struct({
            date: Schema.DateFromSelf,
            extraTicks: Schema.BigIntFromSelf,
        })
    ),
    {
        encode: (input) => {
            const date = "date" in input ? input.date : input;
            const extraTicks = "extraTicks" in input ? input.extraTicks : 0n;
            return BigInt(date.getTime()) * 10_000n + 621_355_968_000_000_000n + extraTicks;
        },
        decode: (cSharpTicks) => {
            const ms = (cSharpTicks - 621_355_968_000_000_000n) / 10_000n;
            return { date: new Date(Number(ms)), extraTicks: cSharpTicks % 10_000n } as const;
        },
    }
);

/** @internal */
export const unityColor = Schema.Struct({
    r: EffectSchemas.Number.U8,
    g: EffectSchemas.Number.U8,
    b: EffectSchemas.Number.U8,
});

/** @internal */
export const unityColorFromString = Schema.transform(
    Schema.TemplateLiteralParser(
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt),
        ":",
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt),
        ":",
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt)
    ),
    unityColor,
    {
        encode: (color) => [color.r, ":", color.g, ":", color.b] as const,
        decode: (parts) => ({ r: parts[0], g: parts[2], b: parts[4] }) as const,
    }
);

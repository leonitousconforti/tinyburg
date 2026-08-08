import * as Array from "effect/Array";
import * as Cache from "effect/Cache";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";
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
        schema: Schema.Codec<any, string, any, any> & {
            readonly "~encoded.optionality": "required";
            readonly "~encoded.mutability": "readonly";
            readonly "~type.optionality": "required";
            readonly "~type.mutability": "readonly";
        };
    }>,
>(
    items: Items,
    separator: string | undefined = ","
): Schema.decodeTo<
    Schema.Struct<
        {
            [K in Items[number]["property"]]: Extract<
                Items[number],
                {
                    property: K;
                }
            >["schema"];
        } & {
            readonly $unknown: Schema.$Array<Schema.String>;
        }
    >,
    Schema.String,
    Items[number]["schema"]["DecodingServices"],
    Items[number]["schema"]["EncodingServices"]
> => {
    const indexesByProperty = Function.pipe(
        items,
        Array.map((item, index) => Tuple.make(item.property, index)),
        HashMap.fromIterable<PropertyKey, number>
    );

    const order = Order.mapInput<Entry, PropertyKey>(([first]) => first)(
        Order.make((a, b) => {
            const aIndex = HashMap.getUnsafe(indexesByProperty, a);
            const bIndex = HashMap.getUnsafe(indexesByProperty, b);
            if (aIndex < bIndex) return -1;
            else if (aIndex > bIndex) return 1;
            else return 0;
        })
    );

    type Fields = { [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] };
    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const fieldEntries = Object.fromEntries(items.map((item) => Tuple.make(item.property, item.schema))) as Fields;
    const to = Schema.Struct({ $unknown: Schema.Array(Schema.String), ...fieldEntries });
    const from = Schema.String;

    const transformation = SchemaTransformation.transformOrFail({
        // { a: "123", b: "456" } -> "123,456"
        encode: (properties: (typeof to)["Encoded"]): Effect.Effect<string, SchemaIssue.Issue, never> => {
            const allEntries = Object.entries(properties);
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const unknownEntries = (properties as unknown as { readonly $unknown: Array<string> })["$unknown"];
            const knownEntries = Array.filter(allEntries, ([key]) => HashMap.has(indexesByProperty, key));

            if (knownEntries.length + unknownEntries.length < items.length) {
                return Effect.fail(
                    new SchemaIssue.InvalidValue(
                        {
                            message: `Expected at least ${items.length} properties, but got ${knownEntries.length + unknownEntries.length}`,
                        },
                        properties
                    )
                );
            }

            return Function.pipe(
                knownEntries,
                Array.sort(order),
                Array.map(([_, value]) => String(value)),
                Array.appendAll(unknownEntries),
                Array.join(separator),
                Effect.succeed
            );
        },

        // "123,456" -> { a: "123", b: "456" }
        decode: (str: string): Effect.Effect<(typeof to)["Encoded"], SchemaIssue.Issue, never> => {
            const splitted = str.split(separator);
            if (splitted.length < items.length) {
                return Effect.fail(
                    new SchemaIssue.InvalidValue(
                        {
                            message: `Expected at least ${items.length} items, but got ${splitted.length}`,
                        },
                        str
                    )
                );
            }

            const unknownProperties = ["$unknown", splitted.slice(items.length)] as const;
            const knownProperties = splitted
                .slice(0, items.length)
                .map((property, index) => [items[index].property, property] as const);

            const properties = [...knownProperties, unknownProperties];
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const obj = Object.fromEntries(properties) as (typeof to)["Encoded"];
            return Effect.succeed(obj);
        },
    });

    return from.pipe(Schema.decodeTo(to, transformation));
};

/** @internal */
const decodeRegexCache = Effect.runSync(
    Cache.make({
        capacity: 200,
        timeToLive: Duration.minutes(10),
        // Written out for readability alongside the neighbouring signatures.
        // oxlint-disable-next-line typescript/no-unnecessary-type-arguments
        lookup: (key: PropertyKey): Effect.Effect<RegExp, never> =>
            Effect.sync(() => new RegExp(`\\[${String(key)}\\]([\\s\\S]*?)\\[${String(key)}\\]`, "m")),
    })
);

/** @internal */
const unknownMatcher = new RegExp(`\\[([^\\]]+)\\]([\\s\\S]*?)\\[\\1\\]`, "gm");

/** @internal */
export const parseNimblebitObject = <
    Fields extends {
        readonly [x: PropertyKey]: Schema.Codec<any, string, any, any>;
    },
>(
    struct: Schema.Struct<Fields>
): Schema.decodeTo<
    Schema.Struct<
        Fields & {
            readonly $unknown: Schema.$Record<
                Schema.String,
                Schema.Struct<{
                    value: Schema.String;
                    $locationMetadata: Schema.Struct<{
                        after: Schema.NullishOr<Schema.String>;
                    }>;
                }>
            >;
        }
    >,
    Schema.String,
    Schema.Struct.DecodingServices<Fields>,
    Schema.Struct.EncodingServices<Fields>
> => {
    const indexesByProperty = Function.pipe(
        Object.entries(struct.fields),
        Array.map((entry, index) => Tuple.make(entry[0], index)),
        HashMap.fromIterable<PropertyKey, number>
    );

    const order = Order.mapInput<Entry, PropertyKey>(([first]) => first)(
        Order.make((a, b) => {
            const aIndex = HashMap.getUnsafe(indexesByProperty, a);
            const bIndex = HashMap.getUnsafe(indexesByProperty, b);
            if (aIndex < bIndex) return -1;
            else if (aIndex > bIndex) return 1;
            else return 0;
        })
    );

    const filter = Array.filterMap<Entry, Entry, Entry>(
        Filter.fromPredicateOption(([key, value]: Entry) => {
            const discard = value === undefined || value === null;
            return discard ? Option.none() : Option.some(Tuple.make(key, value));
        })
    );

    const names = Function.pipe(
        Object.entries(struct.fields),
        Array.map(([key, schema]) => {
            const annotations = Schema.resolveAnnotationsKey(schema);
            const nimblebitSaveDataKey = annotations?.nimblebitSaveDataKey ?? key;
            return Tuple.make(key, nimblebitSaveDataKey);
        }),
        HashMap.fromIterable<string, string>
    );

    const reverseNames = Function.pipe(
        HashMap.entries(names),
        Array.fromIterable,
        Array.map(([key, value]) => Tuple.make(value, key)),
        HashMap.fromIterable<string, string>
    );

    const tryGetNimblebitSaveDataKey = (key: string): string =>
        HashMap.get(names, key).pipe(Option.getOrElse(() => key));

    const tryGetPropertyKey = (nimblebitSaveDataKey: string): string =>
        HashMap.get(reverseNames, nimblebitSaveDataKey).pipe(Option.getOrElse(() => nimblebitSaveDataKey));

    const from = Schema.String;
    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const to = struct.mapFields(
        Struct.assign({
            $unknown: Schema.Record(
                Schema.String,
                Schema.Struct({
                    value: Schema.String,
                    $locationMetadata: Schema.Struct({
                        after: Schema.NullishOr(Schema.String),
                    }),
                })
            ),
        })
    ) as Schema.Struct<
        Fields & {
            readonly $unknown: Schema.$Record<
                Schema.String,
                Schema.Struct<{
                    value: Schema.String;
                    $locationMetadata: Schema.Struct<{
                        after: Schema.NullishOr<Schema.String>;
                    }>;
                }>
            >;
        }
    >;

    const transformation = SchemaTransformation.transform({
        // { a: "123", b: "456" } -> "[a]123[a][b]456[b]"
        encode: (properties: (typeof to)["Encoded"]): string => {
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const { $unknown, ...knownProperties } = properties as unknown as {
                $unknown: Record<
                    string,
                    {
                        value: string;
                        $locationMetadata: {
                            after: string | null | undefined;
                        };
                    }
                >;
            };

            const unknownPropertiesByAfter = Array.reduce(
                Object.entries($unknown),
                { accumulator: {}, lastAfterInserted: null, lastAfter: null } as {
                    lastAfter: string | null | undefined;
                    lastAfterInserted: string | null | undefined;
                    accumulator: Record<string, Array.NonEmptyReadonlyArray<readonly [string, string]>>;
                },
                ({ accumulator, lastAfter, lastAfterInserted }, [key, { $locationMetadata, value }]) => {
                    const after = $locationMetadata.after ?? "";
                    const tuple = Tuple.make(key, value);
                    if (after === lastAfter) {
                        return {
                            lastAfter: key,
                            lastAfterInserted,
                            accumulator: Record.modify(accumulator, lastAfterInserted!, Array.append(tuple)).pipe(
                                Option.getOrElse(() => Record.set(accumulator, lastAfterInserted!, Array.of(tuple)))
                            ),
                        };
                    } else {
                        return {
                            lastAfter: key,
                            lastAfterInserted: after,
                            accumulator: {
                                ...accumulator,
                                [after]: [tuple] as const,
                            },
                        };
                    }
                }
            ).accumulator;

            return Function.pipe(
                Object.entries(knownProperties),
                Array.sort(order),
                Array.flatMap((entry) => [entry, ...(unknownPropertiesByAfter[entry[0]] ?? [])]),
                Array.map(([key, value]) => Tuple.make(tryGetNimblebitSaveDataKey(key), value)),
                filter,
                Array.map(entryToString),
                Array.join("")
            );
        },

        // "[a]123[a][b]456[b]" -> { a: "123", b: "456" }
        decode: (str: string): (typeof to)["Encoded"] => {
            const outEntries: Array<[string, string]> = [];
            for (const fieldName of Object.keys(struct.fields)) {
                const key = tryGetNimblebitSaveDataKey(fieldName);
                const matcher = Effect.runSync(decodeRegexCache.lookup(key));
                const match = matcher.exec(str);
                const value = match ? match[1] : undefined;
                if (value !== undefined) outEntries.push([fieldName, value]);
            }

            const knownProperties = new Set(outEntries.map(([key]) => key));
            const unknownEntries: Record<
                string,
                {
                    value: string;
                    $locationMetadata: {
                        after: string | null | undefined;
                    };
                }
            > = {};

            let lastKey: string | null = null;
            let match: RegExpExecArray | null = null;
            while ((match = unknownMatcher.exec(str)) !== null) {
                const key = match[1];
                const value = match[2];
                const name = tryGetPropertyKey(key);
                if (!knownProperties.has(name)) {
                    unknownEntries[name] = {
                        value,
                        $locationMetadata: {
                            after: lastKey,
                        },
                    };
                }
                lastKey = name;
            }

            const allEntries = [...outEntries, ["$unknown", unknownEntries]];
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            return Object.fromEntries(allEntries) as (typeof to)["Encoded"];
        },
    });

    return from.pipe(Schema.decodeTo(to, transformation));
};

/** @internal */
export const CSharpDate = Schema.BigInt.pipe(
    Schema.decodeTo(
        Schema.Union([
            Schema.Date,
            Schema.Struct({
                date: Schema.Date,
                extraTicks: Schema.BigInt,
            }),
        ]),
        SchemaTransformation.transform({
            encode: (input) => {
                const date = "date" in input ? input.date : input;
                const extraTicks = "extraTicks" in input ? input.extraTicks : 0n;
                return BigInt(date.getTime()) * 10_000n + 621_355_968_000_000_000n + extraTicks;
            },
            decode: (cSharpTicks) => {
                const ms = (cSharpTicks - 621_355_968_000_000_000n) / 10_000n;
                return { date: new Date(Number(ms)), extraTicks: cSharpTicks % 10_000n } as const;
            },
        })
    )
);

/** @internal */
export const UnityColor = Schema.TemplateLiteralParser([
    Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Finite)),
    ":",
    Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Finite)),
    ":",
    Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Finite)),
]).pipe(
    Schema.decodeTo(
        Schema.Struct({
            r: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 255 })),
            g: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 255 })),
            b: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 255 })),
        }),
        SchemaTransformation.transform({
            encode: (color) => [color.r, ":", color.g, ":", color.b] as const,
            decode: (parts) => ({ r: parts[0], g: parts[2], b: parts[4] }) as const,
        })
    )
);

/** @internal */
export function split(options?: { readonly separator?: string | undefined }) {
    return Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String>(
        Schema.Array(Schema.String),
        SchemaTransformation.transform({
            encode: (array) => array.join(options?.separator ?? ","),
            decode: (str) => str.split(options?.separator ?? ","),
        })
    );
}

/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";

declare module "effect/Schema" {
    namespace Annotations {
        interface Augment {
            readonly nimblebitSaveDataKey?: string | undefined;
        }
    }
}

/** @internal */
const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @since 1.0.0
 * @category Parsers
 */
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
    separator: string = ","
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
    type Fields = { [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] };
    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const fields = Object.fromEntries(items.map((item) => [item.property, item.schema])) as Fields;
    const to = Schema.Struct({ $unknown: Schema.Array(Schema.String), ...fields });

    const transformation = SchemaTransformation.transformEffect({
        // { a: "123", b: "456", $unknown: ["789"] } -> "123,456,789"
        encode: (properties: (typeof to)["Encoded"]): Effect.Effect<string, SchemaIssue.Issue, never> => {
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const record = properties as unknown as Readonly<Record<PropertyKey, string>> & {
                readonly $unknown: ReadonlyArray<string>;
            };
            const known = items.map((item) => record[item.property]);
            return Effect.succeed([...known, ...record.$unknown].join(separator));
        },

        // "123,456,789" -> { a: "123", b: "456", $unknown: ["789"] }
        decode: (str: string): Effect.Effect<(typeof to)["Encoded"], SchemaIssue.Issue, never> => {
            const parts = str.split(separator);
            if (parts.length < items.length) {
                return Effect.fail(
                    new SchemaIssue.InvalidValue(
                        { message: `Expected at least ${items.length} items, but got ${parts.length}` },
                        str
                    )
                );
            }

            const known = items.map((item, index) => [item.property, parts[index]] as const);
            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const obj = Object.fromEntries([
                ...known,
                ["$unknown", parts.slice(items.length)],
            ]) as (typeof to)["Encoded"];
            return Effect.succeed(obj);
        },
    });

    return Schema.String.pipe(Schema.decodeTo(to, transformation));
};

/**
 * @since 1.0.0
 * @category Parsers
 */
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
    // Field name -> save data key, in declaration order (which is also the encode order).
    const saveDataKeys = new Map(
        Object.entries(struct.fields).map(
            ([field, schema]) => [field, Schema.resolveAnnotationsKey(schema)?.nimblebitSaveDataKey ?? field] as const
        )
    );
    const fieldNames = new Map(Array.from(saveDataKeys, ([field, key]) => [key, field] as const));
    const order = new Map(Array.from(saveDataKeys.keys(), (field, index) => [field, index] as const));
    const matchers = Array.from(
        saveDataKeys,
        ([field, key]) =>
            [field, new RegExp(`\\[${escapeRegExp(key)}\\]([\\s\\S]*?)\\[${escapeRegExp(key)}\\]`)] as const
    );

    const toSaveDataKey = (field: string): string => saveDataKeys.get(field) ?? field;
    const toFieldName = (key: string): string => fieldNames.get(key) ?? key;

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
            const { $unknown, ...known } = properties as unknown as Record<string, string | null | undefined> & {
                readonly $unknown: Record<
                    string,
                    {
                        value: string;
                        $locationMetadata: {
                            after: string | null | undefined;
                        };
                    }
                >;
            };

            // Each run of consecutive unknown properties goes back after the
            // property that preceded the run, keyed by that property's name.
            // A run that came before every known property is keyed by "".
            const runs = new Map<string, Array<readonly [string, string]>>();
            let lastKey: string | null | undefined = null;
            let run: Array<readonly [string, string]> = [];
            for (const [key, { value, $locationMetadata }] of Object.entries($unknown)) {
                const after = $locationMetadata.after ?? "";
                if (after !== lastKey) {
                    run = [];
                    runs.set(after, run);
                }
                run.push([key, value]);
                lastKey = key;
            }

            const entries = Object.entries(known)
                .sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
                .flatMap((entry) => [entry, ...(runs.get(entry[0]) ?? [])]);

            return [...(runs.get("") ?? []), ...entries]
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([field, value]) => {
                    const key = toSaveDataKey(field);
                    return `[${key}]${value}[${key}]`;
                })
                .join("");
        },

        // "[a]123[a][b]456[b]" -> { a: "123", b: "456" }
        decode: (str: string): (typeof to)["Encoded"] => {
            const known: Array<readonly [string, string]> = [];
            for (const [field, matcher] of matchers) {
                const match = matcher.exec(str);
                if (match !== null) known.push([field, match[1]]);
            }

            const knownFields = new Set(known.map(([field]) => field));
            const unknown: Record<
                string,
                {
                    value: string;
                    $locationMetadata: {
                        after: string | null | undefined;
                    };
                }
            > = {};
            let lastField: string | null = null;
            for (const [, key, value] of str.matchAll(/\[([^\]]+)\]([\s\S]*?)\[\1\]/g)) {
                const field = toFieldName(key);
                if (!knownFields.has(field)) {
                    unknown[field] = { value, $locationMetadata: { after: lastField } };
                }
                lastField = field;
            }

            // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            return Object.fromEntries([...known, ["$unknown", unknown]]) as (typeof to)["Encoded"];
        },
    });

    return Schema.String.pipe(Schema.decodeTo(to, transformation));
};

/** @internal */
const ticksPerMillisecond = 10_000n;

/** @internal */
const unixEpochTicks = 621_355_968_000_000_000n;

/**
 * A C# `DateTime.Ticks` value. Ticks are 100ns, finer than a js `Date` can
 * hold, so decoding keeps the remainder as `extraTicks` and encoding adds it
 * back.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CSharpDate: Schema.decodeTo<
    Schema.Union<
        readonly [
            Schema.Date,
            Schema.Struct<{
                readonly date: Schema.Date;
                readonly extraTicks: Schema.BigInt;
            }>,
        ]
    >,
    Schema.BigInt,
    never
> = Schema.BigInt.pipe(
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
                return BigInt(date.getTime()) * ticksPerMillisecond + unixEpochTicks + extraTicks;
            },
            decode: (cSharpTicks) => {
                // Take the remainder off first so the division is exact, which
                // keeps dates before 1970 from rounding toward the epoch.
                const extraTicks = cSharpTicks % ticksPerMillisecond;
                const ms = (cSharpTicks - extraTicks - unixEpochTicks) / ticksPerMillisecond;
                return { date: new Date(Number(ms)), extraTicks } as const;
            },
        })
    )
);

/** @internal */
const ColorChannel = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 255 }));

/**
 * A Unity color written as `"r:g:b"`, each channel 0-255.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const UnityColor: Schema.decodeTo<
    Schema.Struct<{
        readonly r: Schema.Int;
        readonly g: Schema.Int;
        readonly b: Schema.Int;
    }>,
    Schema.TemplateLiteralParser<
        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
    >,
    never,
    never
> = Schema.TemplateLiteralParser([
    Schema.FiniteFromString,
    ":",
    Schema.FiniteFromString,
    ":",
    Schema.FiniteFromString,
]).pipe(
    Schema.decodeTo(
        Schema.Struct({ r: ColorChannel, g: ColorChannel, b: ColorChannel }),
        SchemaTransformation.transform({
            encode: (color) => [color.r, ":", color.g, ":", color.b] as const,
            decode: (parts) => ({ r: parts[0], g: parts[2], b: parts[4] }) as const,
        })
    )
);

/**
 * Splits a string on `separator` (`","` by default). An empty string is an
 * empty list, not a list holding one empty string.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const split =
    (options?: {
        readonly separator?: string | undefined;
    }): ((from: Schema.String) => Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>) =>
    (from) => {
        const separator = options?.separator ?? ",";
        return from.pipe(
            Schema.decodeTo(
                Schema.Array(Schema.String),
                new SchemaTransformation.Transformation(
                    SchemaGetter.split({ separator }),
                    SchemaGetter.transform((array: ReadonlyArray<string>) => array.join(separator))
                )
            )
        );
    };

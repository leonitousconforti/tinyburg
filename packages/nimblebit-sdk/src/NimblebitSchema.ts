/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */

import * as EffectSchemas from "effect-schemas";
import * as Schema from "effect/Schema";

import * as internal from "./internal/Schema.ts";

/**
 * @since 1.0.0
 * @category Types
 */
export type ValidateNimblebitItemSchema<
    Items extends ReadonlyArray<{
        property: PropertyKey;
        schema: Schema.Schema.Any;
    }>,
> = {
    [K in keyof Items]: Items[K] extends {
        property: infer P;
        schema: Schema.Schema<infer _A, infer _I, infer _R>;
    }
        ? [_I] extends [string | Readonly<string>]
            ? { property: P; schema: Items[K]["schema"] }
            : { property: P; schema: `Nimblebit ordered list items schemas must be encodeable to strings` }
        : Items[K];
};

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitOrderedList: <
    const Items extends ReadonlyArray<{
        property: PropertyKey;
        schema: Schema.Schema.Any;
    }>,
>(
    items: ValidateNimblebitItemSchema<Items>,
    separator?: string | undefined
) => Schema.transformOrFail<
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
> = internal.parseNimblebitOrderedList;

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitObject: <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>
) => Schema.transformOrFail<
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
> = internal.parseNimblebitObject;

/**
 * @since 1.0.0
 * @category Schemas
 */
export const CSharpDate = Schema.transform(
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

/**
 * @since 1.0.0
 * @category Schemas
 */
export const UnityColor = Schema.transform(
    Schema.TemplateLiteralParser(
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt),
        ":",
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt),
        ":",
        Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt)
    ),
    Schema.Struct({
        r: EffectSchemas.Number.U8,
        g: EffectSchemas.Number.U8,
        b: EffectSchemas.Number.U8,
    }),
    {
        encode: (color) => [color.r, ":", color.g, ":", color.b] as const,
        decode: (parts) => ({ r: parts[0], g: parts[2], b: parts[4] }) as const,
    }
);

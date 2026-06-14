/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */

import type * as Schema from "effect/Schema";

import * as internal from "./internal/Schema.ts";

declare module "effect/Schema" {
    namespace Annotations {
        interface Augment {
            readonly nimblebitSaveDataKey?: string | undefined;
        }
    }
}

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitOrderedList: <
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
    separator?: string | undefined
) => Schema.decodeTo<
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
> = internal.parseNimblebitOrderedList;

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitObject: <
    Fields extends {
        readonly [x: PropertyKey]: Schema.Codec<any, string, any, any>;
    },
>(
    struct: Schema.Struct<Fields>
) => Schema.decodeTo<
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
> = internal.parseNimblebitObject;

/**
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
    never,
    never
> = internal.CSharpDate;

/**
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
        readonly [
            Schema.compose<Schema.Finite, Schema.NumberFromString>,
            ":",
            Schema.compose<Schema.Finite, Schema.NumberFromString>,
            ":",
            Schema.compose<Schema.Finite, Schema.NumberFromString>,
        ]
    >,
    never,
    never
> = internal.UnityColor;

/**
 * @since 1.0.0
 * @category Schemas
 */
export const split: (
    options?:
        | {
              readonly separator?: string | undefined;
          }
        | undefined
) => (from: Schema.String) => Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never> =
    internal.split;

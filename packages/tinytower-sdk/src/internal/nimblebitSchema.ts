import type { ValidateNimblebitItemSchema } from "../NimblebitSchema.ts";

import * as Array from "effect/Array";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Schema from "effect/Schema";

/** @internal */
export const parseNimblebitOrderedList = <
    const Items extends ReadonlyArray<{
        property: string | number | symbol;
        schema: Schema.Schema.Any;
    }>,
>(
    items: Items & ValidateNimblebitItemSchema<Items[number]["schema"]>,
    separator: string | undefined = ","
): Schema.transformOrFail<
    typeof Schema.String,
    Schema.Struct<{
        [K in Items[number]["property"]]: Extract<
            Items[number],
            {
                property: K;
            }
        >["schema"];
    }>,
    Items[number]["schema"]["Context"]
> => {
    type Fields = { [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] };
    const fields = Object.fromEntries(items.map((item) => [item.property, item.schema] as const)) as Fields;

    const from = Schema.String;
    const to = Schema.Struct(fields);

    const transform = Schema.transform(from, to, {
        // { a: "123", b: "456" } -> "123,456"
        encode: (properties: {
            [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K];
        }): string => {
            const indexesByProperty = Function.pipe(
                items,
                Array.map((item, index) => [item.property, index] as const),
                HashMap.fromIterable<string | number | symbol, number>
            );

            const str = Object.entries(properties)
                .sort(([aKey], [bKey]) => {
                    const aIndex = HashMap.unsafeGet(indexesByProperty, aKey);
                    const bIndex = HashMap.unsafeGet(indexesByProperty, bKey);
                    return aIndex - bIndex;
                })
                .map(([_, value]) => value)
                .join(separator);

            return str;
        },

        // "123,456" -> { a: "123", b: "456" }
        decode: (str: string): { [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K] } => {
            // TODO: Skip?
            const splitted = str.split(separator).map((property, index) => [items[index].property, property] as const);
            const obj = Object.fromEntries(splitted);
            return obj as { [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K] };
        },
    });

    return transform;
};

/** @internal */
export const parseNimblebitObject = <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>
): Schema.transform<typeof Schema.String, Schema.Struct<Fields>> => {
    const getPropertyName = (input: [property: string | number | symbol, u: unknown]): string | number | symbol => {
        if (Schema.isPropertySignature(input[1]) && input[1].ast._tag === "PropertySignatureTransformation") {
            return input[1].ast.from.fromKey ?? input[0];
        } else {
            return input[0];
        }
    };

    const from = Schema.String;
    const to = struct;

    return Schema.transform(from, to, {
        // { a: "123", b: "456" } -> "[a]123[a][b]456[b]"
        encode: (properties: {
            [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K];
        }): string => {
            const indexesByProperty = Function.pipe(
                Object.entries(struct.fields),
                Array.map((entry, index) => [getPropertyName(entry), index] as const),
                HashMap.fromIterable<string | number | symbol, number>
            );

            const str = Object.entries(properties)
                .sort(([aKey], [bKey]) => {
                    const aIndex = HashMap.unsafeGet(indexesByProperty, aKey);
                    const bIndex = HashMap.unsafeGet(indexesByProperty, bKey);
                    return aIndex - bIndex;
                })
                .map(([key, value]) => `[${key}]${value}[${key}]`)
                .join("");

            return str;
        },

        // "[a]123[a][b]456[b]" -> { a: "123", b: "456" }
        decode: (str: string): { [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K] } => {
            const extracted = Object.entries(struct.fields)
                .map(getPropertyName)
                .map((key) => {
                    const matcher = new RegExp(`\\[${String(key)}\\]([\\s\\S]*?)\\[${String(key)}\\]`, "gm");
                    const match = matcher.exec(str);
                    const value = match ? match[1] : "";
                    return [key, value] as const;
                });

            const obj = Object.fromEntries(extracted);
            return obj as { [K in keyof Schema.Struct.Encoded<Fields>]: Schema.Struct.Encoded<Fields>[K] };
        },
    });
};

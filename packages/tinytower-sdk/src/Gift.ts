/**
 * @since 1.0.0
 * @category Gifts
 */

import * as Schema from "effect/Schema";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import * as SyncItemType from "./SyncItemType.ts";

/**
 * Gift schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Struct({
    /** Unique id for the gift. */
    id: Schema.NumberFromString,

    /** Who the gift was sent to (should be you!). */
    to: NimblebitConfig.PlayerIdSchema,

    /** Who the gift was sent from. */
    from: NimblebitConfig.PlayerIdSchema,

    /** The type of the gift. */
    type: Schema.Enum(SyncItemType.SyncItemType),

    /** The contents of the gift. */
    contents: Schema.String,

    /** Validation hash for the gift, unsure how to compute. */
    checksum: Schema.String,

    /** Not sure. */
    c: Schema.Unknown,
}).pipe(
    Schema.encodeKeys({
        id: "gift_id",
        to: "gift_to",
        from: "gift_from",
        type: "gift_type",
        contents: "gift_str",
        checksum: "h",
        c: "c",
    })
);

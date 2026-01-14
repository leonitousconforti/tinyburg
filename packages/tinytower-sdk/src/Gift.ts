/**
 * @since 1.0.0
 * @category Gifts
 */

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as Schema from "effect/Schema";

import * as SyncItemType from "./SyncItemType.ts";

/**
 * Gift schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Struct({
    /** Unique id for the gift. */
    id: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("gift_id")),

    /** Who the gift was sent to (should be you!). */
    to: NimblebitConfig.PlayerIdSchema.pipe(Schema.propertySignature, Schema.fromKey("gift_to")),

    /** Who the gift was sent from. */
    from: NimblebitConfig.PlayerIdSchema.pipe(Schema.propertySignature, Schema.fromKey("gift_from")),

    /** The type of the gift. */
    type: Schema.Enums(SyncItemType.SyncItemType).pipe(Schema.propertySignature, Schema.fromKey("gift_type")),

    /** The contents of the gift. */
    contents: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("gift_str")),

    /** Validation hash for the gift, unsure how to compute. */
    checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),

    /** Not sure. */
    c: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("c")),
});

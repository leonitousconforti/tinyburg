import type { SyncItemType } from "./sync-item.js";

export interface IGift {
    /**
     * Unique id for the gift.
     */
    gift_id: string;

    /**
     * Who the gift was sent from.
     */
    gift_to: string;

    /**
     * Who the gift was sent to (should be you!).
     */
    gift_from: string;

    /**
     * The type of the gift.
     */
    gift_type: SyncItemType;

    /**
     * The contents of the gift.
     */
    gift_str: string;

    /**
     * Validation hash for the gift, unsure how to compute.
     */
    h: string;

    /**
     * Not sure.
     */
    c: number;
}

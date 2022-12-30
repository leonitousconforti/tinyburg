import type { ILogger } from "./logger.js";

import { DebugLogger } from "./logger.js";
import { randomFillSync } from "node:crypto";

// Debug logger
const loggingNamespace = "tinyburg:crypto_salt";
const debug = new DebugLogger(loggingNamespace);

export const cryptoSalt = (log: ILogger = debug): number => {
    const a = new Int32Array(1);
    const salt = Buffer.from(randomFillSync(a).buffer, a.byteOffset, a.byteLength).readIntBE(0, 4);
    log.debug("new random crypto salt: %d", salt);
    return salt;
};

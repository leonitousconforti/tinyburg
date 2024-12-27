import type { ILogger } from "./logger.js";

import { createHash } from "node:crypto";
import { NoopLogger } from "./logger.js";

// Noop logger
const noop: ILogger = new NoopLogger();

export const cryptoMD5 = (input: string, logger: ILogger = noop): string => {
    const hash = createHash("md5").update(input).digest("hex");
    logger.debug("Hashed %s into %s", input, hash);
    return hash;
};

import type { ILogger } from "../logger.js";

export function createLoggerClosure<HeadArgs extends readonly any[], ReturnType extends unknown>(
    func: (...args: [...HeadArgs, ILogger | undefined]) => ReturnType,
    logger?: ILogger
): (...args: HeadArgs) => ReturnType {
    return (...args: HeadArgs) => func(...args, logger);
}

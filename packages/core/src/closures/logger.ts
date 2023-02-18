import type { ILogger } from "../logger.js";

export function createLoggerClosure<HeadArguments extends readonly any[], ReturnType extends unknown>(
    function_: (...arguments_: [...HeadArguments, ILogger | undefined]) => ReturnType,
    logger?: ILogger
): (...arguments_: HeadArguments) => ReturnType {
    return (...arguments_: HeadArguments) => function_(...arguments_, logger);
}

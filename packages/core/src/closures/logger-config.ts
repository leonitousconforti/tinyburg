import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";

export function loggerConfigClosure<MiddleArguments extends readonly any[], ReturnType extends unknown>(
    function_: (...arguments_: [ITTConfig, ...MiddleArguments, ILogger | undefined]) => ReturnType,
    parameters: [config: ITTConfig, logger?: ILogger]
): (...arguments_: MiddleArguments) => ReturnType {
    // return createConfigClosure(createLoggerClosure(func, params[1]), params[0]);
    return (...arguments_: MiddleArguments) => function_(parameters[0], ...arguments_, parameters[1]);
}

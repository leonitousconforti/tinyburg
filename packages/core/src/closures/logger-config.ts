import type { ILogger } from "../logger.js";
import type { IConfig } from "../config.js";

export function loggerConfigClosure<MiddleArguments extends readonly any[], ReturnType extends unknown>(
    function_: (...arguments_: [IConfig, ...MiddleArguments, ILogger | undefined]) => ReturnType,
    parameters: [config: IConfig, logger?: ILogger]
): (...arguments_: MiddleArguments) => ReturnType {
    // return createConfigClosure(createLoggerClosure(func, params[1]), params[0]);
    return (...arguments_: MiddleArguments) => function_(parameters[0], ...arguments_, parameters[1]);
}

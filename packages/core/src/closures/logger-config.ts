import type { ILogger } from "../logger.js";
import type { ITTConfig } from "../tt-config.js";

export function loggerConfigClosure<MiddleArgs extends readonly any[], ReturnType extends unknown>(
    func: (...args: [ITTConfig, ...MiddleArgs, ILogger | undefined]) => ReturnType,
    params: [config: ITTConfig, logger?: ILogger]
): (...args: MiddleArgs) => ReturnType {
    // return createConfigClosure(createLoggerClosure(func, params[1]), params[0]);
    return (...args: MiddleArgs) => func(params[0], ...args, params[1]);
}

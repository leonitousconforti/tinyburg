import type { IConfig } from "../config.js";

export function createConfigClosure<TailArguments extends readonly any[], ReturnType extends unknown>(
    function_: (...arguments_: [IConfig, ...TailArguments]) => ReturnType,
    config: IConfig
): (...arguments_: TailArguments) => ReturnType {
    return (...arguments_: TailArguments) => function_(config, ...arguments_);
}

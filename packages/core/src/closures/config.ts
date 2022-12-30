import type { ITTConfig } from "../tt-config.js";

export function createConfigClosure<TailArgs extends readonly any[], ReturnType extends unknown>(
    func: (...args: [ITTConfig, ...TailArgs]) => ReturnType,
    config: ITTConfig
): (...args: TailArgs) => ReturnType {
    return (...args: TailArgs) => func(config, ...args);
}

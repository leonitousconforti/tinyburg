import type { Debugger } from "debug";

interface IEnterLogOptions {
    withArguments?: boolean;
}

interface IExitLogOptions {
    withReturnValue?: boolean;
}

export const EnterLog = (debug: Debugger, options: IEnterLogOptions = {}) => {
    const { withArguments } = options;

    return function (__target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.value!;

        descriptor.value = function (..._arguments: unknown[]) {
            if (withArguments) debug("%s method invoke with params: %o", propertyKey, _arguments);
            else debug("%s method invoked", propertyKey);
            return targetMethod.apply(this, _arguments);
        };

        return descriptor;
    };
};

export const ExitLog = (debug: Debugger, options: IExitLogOptions = {}) => {
    const { withReturnValue } = options;

    return function (__target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.value;

        descriptor.value = function (..._arguments: unknown[]) {
            const returnValue = targetMethod.apply(this, _arguments);
            if (withReturnValue) debug("%s method completed with return value %o", propertyKey, returnValue);
            else debug("%s method completed", propertyKey);
            return returnValue;
        };

        return descriptor;
    };
};

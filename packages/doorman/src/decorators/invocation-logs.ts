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

        descriptor.value = function (...args: unknown[]) {
            if (withArguments) debug("%s method invoke with params: %o", propertyKey, args);
            else debug("%s method invoked", propertyKey);
            return targetMethod.apply(this, args);
        };

        return descriptor;
    };
};

export const ExitLog = (debug: Debugger, options: IExitLogOptions = {}) => {
    const { withReturnValue } = options;

    return function (__target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.value;

        descriptor.value = function (...args: unknown[]) {
            const returnValue = targetMethod.apply(this, args);
            if (withReturnValue) debug("%s method completed with return value %o", propertyKey, returnValue);
            else debug("%s method completed", propertyKey);
            return returnValue;
        };

        return descriptor;
    };
};

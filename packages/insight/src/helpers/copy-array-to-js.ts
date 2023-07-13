import "frida-il2cpp-bridge";

/* eslint-disable @typescript-eslint/naming-convention */
export const copyArrayToJs = <T extends Il2Cpp.Field.Type>(array: Il2Cpp.Array<T>): T[] =>
    Array.from({ length: array.length }).map((_, index) => array.get(index));

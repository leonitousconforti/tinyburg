import "frida-il2cpp-bridge";

export const copyArrayToJs = <T extends Il2Cpp.Field.Type>(array: Il2Cpp.Array<T>): Array<T> =>
    Array.from({ length: array.length }).map((_, index) => array.get(index));

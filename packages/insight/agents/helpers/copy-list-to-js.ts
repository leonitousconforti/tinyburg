import "frida-il2cpp-bridge";

export const copyListToJs = <T extends Il2Cpp.Field.Type = Il2Cpp.Field.Type>(list: Il2Cpp.Object): Array<T> =>
    Array.from({ length: list.method<number>("get_Count").invoke() || 0 }).map((_, index) =>
        list.method<T>("get_Item").invoke(index)
    );

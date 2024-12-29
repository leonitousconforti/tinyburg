import "frida-il2cpp-bridge";

import { copyArrayToJs } from "./copy-array-to-js.js";

export function copyDictionaryToJs<TKey extends Il2Cpp.String | number, TValue extends Il2Cpp.Method.ReturnType>(
    object: Il2Cpp.Object
): Record<TKey extends number ? number : string, TValue> {
    const dictionary = {} as Record<string | number, TValue>;

    const keys = object.method<Il2Cpp.Object>("get_Keys").invoke();
    const keysClass = keys.class.generics[0]!;
    const numberKeys = object.method<number>("get_Count").invoke();
    const keysArray = Il2Cpp.array<TKey>(keysClass, numberKeys);
    keys.method<void>("CopyTo").invoke(keysArray, 0);
    const keysJs = copyArrayToJs(keysArray);

    for (const key of keysJs) {
        const value = object.method<TValue>("get_Item").invoke(key);
        if (key instanceof Il2Cpp.String && key.content) {
            dictionary[key.content] = value;
        } else if (key instanceof Il2Cpp.String) {
            send("Not copying key+value to dictionary because the key is not a string");
        } else {
            dictionary[key as number] = value;
        }
    }

    return dictionary;
}

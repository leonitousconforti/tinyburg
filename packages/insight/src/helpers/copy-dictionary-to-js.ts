import "frida-il2cpp-bridge";

import { enumerateDictionary } from "./enumerate-dictionary.js";

// Copies a dictionary from Il2Cpp to javascript by enumerating over the
// dictionary and adding all the elements to a js object.
export function copyDictionaryToJs<TKey extends Il2Cpp.String | number, TValue extends Il2Cpp.Method.ReturnType>(
    object: Il2Cpp.Object
): Record<TKey extends number ? number : string, TValue> {
    // Create the js dictionary
    const dictionary = {} as Record<string | number, TValue>;

    // Enumerate the cpp dictionary using another helper
    for (const [key, value] of enumerateDictionary<TKey, TValue>(object)) {
        if (key instanceof Il2Cpp.String && key.content) {
            dictionary[key.content] = value;
        } else if (key instanceof Il2Cpp.String) {
            send("Not copying key+value to dictionary because the key is not a string");
        } else {
            dictionary[key as unknown as number] = value;
        }
    }
    return dictionary as Record<TKey extends number ? number : string, TValue>;
}

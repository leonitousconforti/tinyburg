import "frida-il2cpp-bridge";

import { isEnumerable } from "./is-enumerable.js";

// Generic generator function that enumerates over all the keys and values of a cpp dictionary.
export const enumerateDictionary = function* <
    TKey extends Il2Cpp.Parameter.Type,
    TValue extends Il2Cpp.Method.ReturnType
>(dictionary: Il2Cpp.Object): Generator<[TKey, TValue], undefined, unknown> {
    // Check to make sure that this object is enumerable. Could throw an error here
    // but I don't want it to tare down the entire script; I would prefer that the frida
    // script kept going. So a log and return will do here.
    if (!isEnumerable(dictionary)) {
        send(`Can not enumerate over 'dictionary' ${dictionary.class.namespace}.${dictionary.class.name}`);
        return;
    }

    // Get all the keys of the dictionary and create an enumerator for them
    const keys = dictionary.method("get_Keys").invoke() as Il2Cpp.Object;
    const keyEnumerator = (keys.method("GetEnumerator").invoke() as Il2Cpp.ValueType).box();

    // Loop over all the keys using the iterator
    while (keyEnumerator.method("MoveNext").invoke() as boolean) {
        // Return the key and value from the dictionary
        const key = keyEnumerator.method("get_Current").invoke() as TKey;
        const value = dictionary.method("get_Item").invoke(key) as TValue;
        yield [key, value];
    }

    // Dispose of the enumerator
    keyEnumerator.tryMethod("Dispose")?.invoke();
    return;
};

import "frida-il2cpp-bridge";

import { isEnumerable } from "./is-enumerable.js";

// Generic generator function that enumerates over all the items of a cpp list or primitive array.
export const enumerateList = function* <T extends Il2Cpp.Field.Type>(
    list: Il2Cpp.Object
): Generator<T, undefined, unknown> {
    // Check to make sure that this object is enumerable. Could throw an error here
    // but I don't want it to tare down the entire script; I would prefer that the frida
    // script kept going. So a log and return will do here.
    if (!isEnumerable(list)) {
        send(`Can not enumerate over 'list' ${list.class.namespace}.${list.class.name}`);
        return;
    }

    // Will use the System.Array class to check if this list is a primitive array type. If
    // it is then we can not box the enumerator because it is for a primitive array type.
    const systemArrayClass = Il2Cpp.corlib.class("System.Array");

    // Check if this list is a primitive array
    const isPrimitiveArray = list.class.isSubclassOf(systemArrayClass, true);

    // Create an enumerator
    const enumerator = list.method<Il2Cpp.ValueType>("GetEnumerator").invoke();
    let enumeratorBoxed: Il2Cpp.Object = enumerator as unknown as Il2Cpp.Object;

    // Box the enumerator if necessary (if it is not a primitive array)
    if (!isPrimitiveArray) {
        enumeratorBoxed = enumerator.box();
    }

    // Enumerate over all values
    while (enumeratorBoxed.method("MoveNext").invoke() as boolean) {
        const current = enumeratorBoxed.method("get_Current").invoke();
        yield current as T;
    }

    // Dispose of the enumerator
    enumeratorBoxed.tryMethod("Dispose")?.invoke();
    return;
};

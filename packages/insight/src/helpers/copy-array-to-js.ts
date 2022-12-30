import "frida-il2cpp-bridge";

import { enumerateList } from "./enumerate-list.js";

// Copies an array from Il2Cpp to javascript by enumerating over the
// array and adding all the elements to a js array.
export function copyArrayToJs<T extends Il2Cpp.Field.Type>(object: Il2Cpp.Object): T[] {
    const array = [] as T[];
    for (const name of enumerateList<T>(object)) {
        array.push(name);
    }
    return array;
}

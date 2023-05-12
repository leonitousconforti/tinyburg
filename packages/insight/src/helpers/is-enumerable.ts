import "frida-il2cpp-bridge";

// Checks that an object is enumerable by checking if it implements the IEnumerable interface
export const isEnumerable = (object: Il2Cpp.Object): boolean => {
    const systemEnumerableInterface = Il2Cpp.corlib.class("System.Collections.IEnumerable");
    return object.class.isSubclassOf(systemEnumerableInterface, true);
};

export const isList = (object: Il2Cpp.Object): boolean => {
    const systemListClass = Il2Cpp.corlib.class("System.Collections.IList");
    const systemCollectionClass = Il2Cpp.corlib.class("System.Collections.ICollection");
    return object.class.isSubclassOf(systemListClass, true) || object.class.isSubclassOf(systemCollectionClass, true);
};

export const isDSO = (object: Il2Cpp.Object): boolean => {
    return object.class.name === "DSO";
};

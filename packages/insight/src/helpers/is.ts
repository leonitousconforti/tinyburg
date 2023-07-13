import "frida-il2cpp-bridge";

export const isEnumerable = (object: Il2Cpp.Object): boolean => {
    const systemEnumerableInterface = Il2Cpp.corlib.class("System.Collections.IEnumerable");
    return object.class.isSubclassOf(systemEnumerableInterface, true);
};

export const isList = (object: Il2Cpp.Object): boolean => {
    const systemListClass = Il2Cpp.corlib.class("System.Collections.IList");
    return object.class.isSubclassOf(systemListClass, true);
};

export const isArray = (object: Il2Cpp.Object): boolean => {
    const systemArrayClass = Il2Cpp.corlib.class("System.Array");
    return object.class.isSubclassOf(systemArrayClass, true);
};

export const isCollection = (object: Il2Cpp.Object): boolean => {
    const systemCollectionInterface = Il2Cpp.corlib.class("System.Collections.ICollection");
    return object.class.isSubclassOf(systemCollectionInterface, true);
};

export const isDSO = (object: Il2Cpp.Object): boolean => {
    return object.class.name === "DSO";
};

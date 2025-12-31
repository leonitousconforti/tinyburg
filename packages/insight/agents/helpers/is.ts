import "frida-il2cpp-bridge";

export const isDSO = (object: Il2Cpp.Object): boolean => {
    return object.class.name === "DSO";
};

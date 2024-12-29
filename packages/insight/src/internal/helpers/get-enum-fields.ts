import "frida-il2cpp-bridge";

export const readEnumFields = (klass: Il2Cpp.Class): Array<[string, string]> =>
    klass.fields
        .filter((field) => field.type.class === klass)
        .map((field) => [field.name, field.value.toString()] as [string, string]);

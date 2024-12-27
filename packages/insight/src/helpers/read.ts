import "frida-il2cpp-bridge";

import { copyListToJs } from "./copy-list-to-js.js";
import { copyArrayToJs } from "./copy-array-to-js.js";
import { isEnumerable, isList, isDSO } from "./is.js";
import { copyDictionaryToJs } from "./copy-dictionary-to-js.js";

export const readObject = (
    object: Il2Cpp.Object
): boolean | number | string | NativePointer | unknown[] | undefined => {
    switch (object.class.type.typeEnum) {
        case Il2Cpp.Type.enum.void: {
            return undefined;
        }

        case Il2Cpp.Type.enum.boolean: {
            return Boolean(object);
        }

        case Il2Cpp.Type.enum.nativePointer:
        case Il2Cpp.Type.enum.unsignedNativePointer: {
            return object.handle.readPointer();
        }

        case Il2Cpp.Type.enum.byte:
        case Il2Cpp.Type.enum.char:
        case Il2Cpp.Type.enum.short:
        case Il2Cpp.Type.enum.int:
        case Il2Cpp.Type.enum.long:
        case Il2Cpp.Type.enum.unsignedByte:
        case Il2Cpp.Type.enum.unsignedShort:
        case Il2Cpp.Type.enum.unsignedInt:
        case Il2Cpp.Type.enum.unsignedLong: {
            return Number(object);
        }

        case Il2Cpp.Type.enum.double:
        case Il2Cpp.Type.enum.float:
        case Il2Cpp.Type.enum.string: {
            const string = String(object);
            if (string === "") return "__Empty String__";
            return string;
        }

        case Il2Cpp.Type.enum.valueType: {
            return (object as unknown as Il2Cpp.ValueType).toString();
        }

        case Il2Cpp.Type.enum.array: {
            return copyArrayToJs(object as unknown as Il2Cpp.Array<Il2Cpp.Object>).map((value) => readObject(value));
        }

        case Il2Cpp.Type.enum.genericInstance: {
            if (isEnumerable(object) && isList(object)) {
                return copyListToJs<Il2Cpp.Object>(object).map((value) => readObject(value));
            }
            return undefined;
        }

        case Il2Cpp.Type.enum.class: {
            if (isEnumerable(object) && isDSO(object)) {
                const entries = Object.entries(copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(object)).map(
                    ([property, value]) => [property, readObject(value)]
                );
                return Object.fromEntries(entries);
            }
            return undefined;
        }

        default: {
            send(`Could not read object ${object.class.name} of typeEnum ${object.class.type.typeEnum}`);
            send("Consider adding an entry in the readObject method to extract this type");
            return undefined;
        }
    }
};

export const readField = (field: Il2Cpp.Field): string | number | boolean | NativePointer | undefined | unknown[] => {
    switch (field.type.typeEnum) {
        case Il2Cpp.Type.enum.void: {
            return undefined;
        }

        case Il2Cpp.Type.enum.boolean: {
            return (field as Il2Cpp.Field<boolean>).value;
        }

        case Il2Cpp.Type.enum.nativePointer:
        case Il2Cpp.Type.enum.unsignedNativePointer: {
            return (field as Il2Cpp.Field<NativePointer>).value;
        }

        case Il2Cpp.Type.enum.byte:
        case Il2Cpp.Type.enum.char:
        case Il2Cpp.Type.enum.short:
        case Il2Cpp.Type.enum.int:
        case Il2Cpp.Type.enum.long:
        case Il2Cpp.Type.enum.unsignedByte:
        case Il2Cpp.Type.enum.unsignedShort:
        case Il2Cpp.Type.enum.unsignedInt:
        case Il2Cpp.Type.enum.unsignedLong:
        case Il2Cpp.Type.enum.double:
        case Il2Cpp.Type.enum.float: {
            return (field as Il2Cpp.Field<number>).value;
        }

        case Il2Cpp.Type.enum.string: {
            return (field as Il2Cpp.Field<Il2Cpp.String>).value.content!;
        }

        case Il2Cpp.Type.enum.valueType: {
            return (field as Il2Cpp.Field<Il2Cpp.ValueType>).value.toString();
        }

        default: {
            send(`Could not read field ${field.type} of typeEnum ${field.type.typeEnum}`);
            send("Consider adding an entry in the readField method to extract this type");
            return undefined;
        }
    }
};

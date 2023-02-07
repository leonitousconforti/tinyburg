import "frida-il2cpp-bridge";

import { copyArrayToJs } from "./copy-array-to-js.js";
import { copyDictionaryToJs } from "./copy-dictionary-to-js.js";
import { isEnumerable, isList, isDSO } from "./is-enumerable.js";

// typeEnum values can be found at https://github.com/vfsfitvnm/frida-il2cpp-bridge/blob/master/src/il2cpp/structs/type-enum.ts
// For whatever reason, if I use Il2Cpp.Type.Enum.Boolean or some other type in the switch statement esbuild will build the
// agent but will throw a runtime error that if can not read property 'Boolean' of undefined.

export const readObject = (object: Il2Cpp.Object): boolean | number | string | undefined | unknown[] => {
    switch (object.class.type.typeEnum) {
        // Boolean
        case 2: {
            return Boolean(object);
        }

        // Char
        case 3: {
            return Number(object);
        }

        // Number variants
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13: {
            return Number(object);
        }

        // String
        case 14: {
            const string = String(object);
            if (string === "") return "__Empty String__";
            return string;
        }

        // Array
        case 20: {
            return copyArrayToJs<Il2Cpp.Object>(object).map((value) => readObject(value));
        }

        // SingleDimensionalZeroLowerBoundArray
        case 27: {
            return copyArrayToJs<Il2Cpp.Object>(object).map((value) => readObject(value));
        }

        // ValueType
        case 17: {
            return (object as unknown as Il2Cpp.ValueType).toString();
        }

        // GenericInstance
        // RequiredModifier
        case 29:
        case 21: {
            if (isEnumerable(object) && isList(object)) {
                return copyArrayToJs<Il2Cpp.Object>(object).map((value) => readObject(value));
            }
            return undefined;
        }

        // Class
        case 18: {
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

export const readField = (field: Il2Cpp.Field): string | number | boolean | undefined | unknown[] => {
    switch (field.type.typeEnum) {
        // Boolean
        case 2: {
            return (field as Il2Cpp.Field<boolean>).value;
        }

        // Char
        case 3: {
            return (field as Il2Cpp.Field<number>).value;
        }

        // Number variants
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13: {
            return (field as Il2Cpp.Field<number>).value;
        }

        // String
        case 14: {
            if (!(field as Il2Cpp.Field<Il2Cpp.String>).value.isNull())
                return (field as Il2Cpp.Field<Il2Cpp.String>).value.content!;
            return undefined;
        }

        // ValueType
        case 17: {
            return (field as Il2Cpp.Field<Il2Cpp.ValueType>).value.toString();
        }

        // Class
        case 18: {
            if (!(field as Il2Cpp.Field<Il2Cpp.Object>).value.isNull()) {
                const entries = (field as Il2Cpp.Field<Il2Cpp.Object>).value.class.fields.map((field) => [
                    field.name,
                    readField(field),
                ]);
                return Object.fromEntries(entries);
            }
            return undefined;
        }

        // GenericInstance
        case 21: {
            const value = (field as Il2Cpp.Field<Il2Cpp.Object>).value;
            if (!value.isNull() && isEnumerable(value) && isDSO(value)) {
                return copyArrayToJs<Il2Cpp.Object>(value).map((value) => readObject(value));
            }
            return undefined;
        }

        default: {
            send(`Could not read field ${field.type} of typeEnum ${field.type.typeEnum}`);
            send("Consider adding an entry in the readField method to extract this type");
            return undefined;
        }
    }
};

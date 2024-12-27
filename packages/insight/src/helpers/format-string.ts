import "frida-il2cpp-bridge";

// Formats a string by removing all the quotation marks after calling .toString()
export const formatString = (string: Il2Cpp.String | Il2Cpp.Object): string => string.toString().replaceAll('"', "");

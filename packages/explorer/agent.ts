import "frida-il2cpp-bridge";

// Fix for https://github.com/vfsfitvnm/frida-il2cpp-bridge/issues/264#issuecomment-1490798519
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).Module = new Proxy(Module, {
    cache: {},

    get(target: typeof Module, property: string | symbol): NativePointer | undefined {
        const patchedFindExportByName = (moduleName: string | null, exportName: string) => {
            if (moduleName === null) {
                return Reflect.get(target, property)(moduleName, exportName);
            }
            this.cache[moduleName] ??= (Module as any).enumerateExports(moduleName);
            return this.cache[moduleName]!.find((module: ModuleExportDetails) => module.name === exportName)?.address;
        };
        return property === "findExportByName" ? patchedFindExportByName : Reflect.get(target, property);
    },
} as ProxyHandler<typeof Module> & { cache: Record<string, ModuleExportDetails[]> });
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-floating-promises
Il2Cpp.perform(() => {
    const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
    const LocalizationManagerClass = csharpAssembly.image.class("LocalizationManager");

    send(LocalizationManagerClass.fields.map((field) => field.name));

    // const snapshot = Il2Cpp.MemorySnapshot.capture();
    // const instances: Il2Cpp.Object[] = snapshot.objects.filter(Il2Cpp.isExactly(LocalizationManagerClass));

    // for (const instance of instances) {
    //     send("here");
    //     send(instance);
    // }

    // snapshot.free();
});

// Il2Cpp.perform(() => {
//     const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");

//     // for (const klass of csharpAssembly.image.classes) {
//     //     for (const field of klass.fields) {
//     //         if (field.type.class.name === "LocalizationManager") {
//     //             send(field.name);
//     //         }
//     //     }
//     // }

//     send("done");
//     const LocalizationManagerClass = csharpAssembly.image.class("LocalizationManager");
//     // const a = LocalizationManagerClass.methods.find((_) => _.name === ".ctor")?.fridaSignature;
//     // send(a);

//     const a = LocalizationManagerClass.alloc();
//     const b = a.method(".ctor").invoke();

//     const maleNamesArray = b.<Il2Cpp.Array<Il2Cpp.String>>("maleNames").value;
//     // send(maleNamesArray);
// });

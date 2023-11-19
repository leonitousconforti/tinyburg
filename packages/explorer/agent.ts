/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable no-var */
import "frida-il2cpp-bridge";
// import { TinyTowerFridaAgent } from "@tinyburg/insight/dist/src/agents/base-frida-agent";

// export class ExplorerAgent extends TinyTowerFridaAgent<ExplorerAgent> {
//     public override loadDependencies() {
//         const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
//         const AppUtilClass = csharpAssembly.image.class("AppUtil");
//         return { AppUtilClass };
//     }

//     public override retrieveData() {
//         const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;
//         return { TTVersion: version || "unknown" };
//     }
// }

// (async function main() {
//     const agent = await new ExplorerAgent().start();
//     send(agent.data.TTVersion);
// })();

send("                                                                  ");

// for (const module_ of Process.enumerateModules()) {
//     for (const export_ of module_.enumerateExports()) {
//         if (export_.name.includes("il2cpp")) {
//             send(`${module_.name}!${export_.name} @ ${export_.address}`);
//         }
//     }
// }

Process.enumerateModules().forEach((module_) => send(`${module_.name} @ ${module_.base}`));

const pointers: any[] = [];
const base = Process.enumerateModules().find((e) => e.name == "libil2cpp.so")!;
const pat = "48 83 EC 28 48 8B 05 ?? ?? ?? ?? 48 85 C0 75 11".replaceAll(/\s/g, "");

Memory.scan(base.base, base.size, pat, {
    onMatch(address, size) {
        send(`Memory.scan() found match at ${address} with size ${size}`);

        Interceptor.attach(address, {
            onEnter: function (args) {
                try {
                    const name = args[1]?.readUtf8String() || args[1]?.readCString() || undefined;
                    if (name) send(`${name} has been loaded.`);
                } catch (e) {}
            },
            onLeave: function (retval) {
                if (!pointers.find((e) => e["il2cpp_domain_get"])) {
                    pointers.push({
                        il2cpp_domain_get: new NativeFunction(ptr(address as any), "pointer", []),
                    });
                    send(`Domain_get found. ${JSON.stringify(pointers.find((e) => e["il2cpp_domain_get"]))}`);
                }
            },
        });

        // Optionally stop scanning early:
    },
    onComplete() {
        send("Memory.scan() complete");
    },
});

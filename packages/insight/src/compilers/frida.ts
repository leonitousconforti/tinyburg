import Debug from "debug";
import path from "node:url";
import * as fridaCompile from "frida-compile";
import { getNodeSystem } from "frida-compile/dist/system/node.js";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:frida-compiler");

export const fridaCompiler = async (agentLocation: string): Promise<string> => {
    const tsSystem = getNodeSystem();
    const projectRoot = path.fileURLToPath(new URL("../", import.meta.url));
    const assets = fridaCompile.queryDefaultAssets(projectRoot, tsSystem);

    const buildOptions: fridaCompile.BuildOptions = {
        assets,
        system: tsSystem,
        projectRoot,
        entrypoint: agentLocation,
        sourceMaps: "included",
        compression: "terser",
    };

    logger("Generated frida-compile build options %o", buildOptions);
    return fridaCompile.build(buildOptions);
};

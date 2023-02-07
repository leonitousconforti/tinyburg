import Debug from "debug";
import path from "node:url";
import fridaCompile from "frida-compile";
import { getNodeSystem } from "frida-compile/dist/system/node.js";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:frida-compiler");

export const fridaCompiler = async (agentLocation: string, _watchMode: boolean = false): Promise<string> => {
    const tsSystem = getNodeSystem();
    const projectRoot = path.fileURLToPath(new URL("../"));
    const assets = fridaCompile.queryDefaultAssets(projectRoot, tsSystem);
    // const tsconfig = path.fileURLToPath(new URL("../tsconfig.agents.json", import.meta.url));

    const buildOptions: fridaCompile.BuildOptions = {
        assets,
        system: tsSystem,
        projectRoot,
        entrypoint: agentLocation,
        sourceMaps: "included",
        compression: "terser",
    };
    logger("Generated frida-compile build options %O", buildOptions);

    const source = fridaCompile.build(buildOptions);
    return source;
};

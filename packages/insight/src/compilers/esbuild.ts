import type { BuildOptions } from "esbuild";

import Debug from "debug";
import path from "node:url";
import { build } from "esbuild";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:esbuild-compiler");

export const esbuildCompiler = async (agentLocation: string): Promise<string> => {
    // Create build options for agents
    const tsconfig = path.fileURLToPath(new URL("../tsconfig.agents.json", import.meta.url));
    const buildOptions: BuildOptions = {
        entryPoints: [agentLocation],
        tsconfig,
        bundle: true,
        write: false,
        minify: true,
        sourcemap: "inline",
    };
    logger(`Generated esbuild options ${JSON.stringify(buildOptions)}`);

    // Compile and inject the frida script
    const source = await build(buildOptions);
    if (!source.outputFiles || !source.outputFiles[0]) throw new Error("Something went wrong when compiling the agent");
    logger("Compiled script");
    return source.outputFiles[0].text;
};

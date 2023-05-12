import type { BuildOptions } from "esbuild";

import path from "node:url";
import { build } from "esbuild";

export const esbuildCompiler = async (agentLocation: string, watchMode: boolean = false): Promise<string> => {
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
    console.log(`Generated esbuild options ${JSON.stringify(buildOptions)}`);

    // Compile and inject the frida script
    console.time("Compiled script");
    const source = await build(buildOptions);
    if (!source.outputFiles || !source.outputFiles[0]) throw new Error("Something went wrong when compiling the agent");
    console.timeEnd("Compiled script");
    return source.outputFiles[0].text;
};

import Debug from "debug";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:swc-compiler");

export const swcCompiler = async (agentLocation: string): Promise<string> => {
    logger(agentLocation);
    throw new Error("Not implemented");
};

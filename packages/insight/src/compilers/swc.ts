import Debug from "debug";
// import swc from "@swc/core";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:swc-compiler");

export const swcCompiler = async (agentLocation: string, watchMode: boolean = false): Promise<string> => {
    logger(agentLocation);
    logger(watchMode);
    return "";
};

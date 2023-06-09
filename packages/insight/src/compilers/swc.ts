import Debug from "debug";
// import swc from "@swc/core";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight:swc-compiler");

export const swcCompiler = async (agentLocation: string): Promise<string> => {
    logger(agentLocation);
    return "";
};

import type { IConfig } from "./config.js";

import { writeFileSync } from "node:fs";

// Save config function params
export interface ISaveConfigParameters {
    config: IConfig;
    fileName: string;
}

// Saves the config to disk
export const saveConfig = ({ config, fileName }: ISaveConfigParameters): void => {
    const data = JSON.stringify(config, undefined, 4);
    writeFileSync(fileName, data);
};

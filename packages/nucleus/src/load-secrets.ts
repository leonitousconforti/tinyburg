import type { IConfig } from "./config.js";

import fs from "node:fs";

export const loadSecrets = (config: IConfig, localFile: string): IConfig => {
    const data = fs.readFileSync(localFile);
    const secretSalt = JSON.parse(data.toString()).secretSalt;

    config.secretSalt = secretSalt;

    if (config.proxy.useProxy) {
        config.proxy.useProxy = false;
    }

    return config;
};

import type { ITTConfig } from "./tt-config.js";

import fs from "node:fs";

export const loadSecrets = (config: ITTConfig, localFile: string): ITTConfig => {
    const data = fs.readFileSync(localFile);
    const secretSalt = JSON.parse(data.toString()).secretSalt;

    config.secretSalt = secretSalt;

    if (config.proxy.useProxy) {
        config.proxy.useProxy = false;
    }

    return config;
};

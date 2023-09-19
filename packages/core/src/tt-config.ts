import { getRandomBurnerBot } from "@tinyburg/bots/burnbots.js";

export interface ITTConfig {
    nimblebitHost: string;
    secretSalt?: string;
    authenticated: boolean;

    proxy: {
        useProxy: boolean;
        address: string;
        api_key?: string;
    };

    burnBot: {
        playerId: string;
        playerSs: string;
    };

    player: {
        playerId: string;
        playerSs?: string;
        playerEmail?: string;
    };
}

export const defaultConfig: ITTConfig = {
    nimblebitHost: "https://sync.nimblebit.com",
    authenticated: false,
    proxy: {
        useProxy: false,
        address: "https://authproxy.tinyburg.app",
    },
    burnBot: getRandomBurnerBot(),
    player: {
        playerId: "",
    },
};

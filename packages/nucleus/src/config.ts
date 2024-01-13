import { getRandomBurnerBot } from "./burnbots.js";

export interface IConfig {
    nimblebitHost: string | URL;
    secretSalt?: string;
    authenticated: boolean;
    game: "TinyTower" | "LegoTower" | "TinyTowerVegas";

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

export const defaultConfig: IConfig = {
    nimblebitHost: new URL("https://sync.nimblebit.com"),
    authenticated: false,
    game: "TinyTower",
    proxy: {
        useProxy: false,
        address: "https://authproxy.tinyburg.app",
    },
    burnBot: getRandomBurnerBot(),
    player: {
        playerId: "",
    },
};

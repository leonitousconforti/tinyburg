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
    burnBot: {
        playerId: "9GTYN",
        playerSs: "89f9b90b-4e1e-4b48-af56-df39da7b17a7",
    },
    player: {
        playerId: "",
    },
};

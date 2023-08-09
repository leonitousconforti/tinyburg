import type { TAgentMain } from "./agent-main-export.js";

export interface IGameStateAgentExports {
    main: TAgentMain<
        [],
        {
            version: string;
            coins: number;
            bux: number;
            goldTickets: number;
            floors: number;
            bitizens: number;
            elevatorSpeed: number;
            // gameScreen:
            //     | "Tower"
            //     | "Hud"
            //     | "Bitbook"
            //     | "Bitizens"
            //     | "Friends"
            //     | "Raffle"
            //     | "Rebuild"
            //     | "Settings"
            //     | "TechTree"
            //     | "Upgrades"
            //     | "Mission"
            //     | "Unknown";
        }
    >;
}

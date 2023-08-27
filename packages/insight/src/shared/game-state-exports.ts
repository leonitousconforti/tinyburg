import type { TAgentMain } from "./agent-main-export.js";

export interface IGameStateAgentExports {
    main: TAgentMain<
        [],
        {
            version: string;
            coins: number;
            bux: number;
            goldenTickets: number;
            allTimeGoldenTickets: number;
            elevatorSpeed: number;
            numberOfFloors: number;
            numberOfBitizens: number;
            numberOfRoofsUnlocked: number;
            numberOfCostumesUnlocked: number;
            numberOfLobbiesUnlocked: number;
            numberOfElevatorsUnlocked: number;
            gameScreen:
                | "Tower"
                | "Airport"
                | "House"
                | "Menu"
                | "Bitbook"
                | "Bitizens"
                | "Friends"
                | "Raffle"
                | "Rebuild"
                | "Settings"
                | "TechTree"
                | "Upgrades"
                | "Mission"
                | "Unknown";
        }
    >;
}

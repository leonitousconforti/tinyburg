import type { TAgentMain } from "./agent-main-export.js";

export interface ISetTowerCredentialsAgentExports {
    main: TAgentMain<
        [playerId: string, playerSs: string, playerEmail: string],
        { playerId: string; playerSs: string; playerEmail: string | undefined }
    >;
}

export interface IGetTowerCredentialsAgentExports {
    main: TAgentMain<[], { playerId: string; playerSs: string; playerEmail: string | undefined }>;
}

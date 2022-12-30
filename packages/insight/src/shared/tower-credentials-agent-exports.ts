import type { TAgentMain } from "./agent-main-export.js";

export interface ITowerCredentialsAgentExports {
    main: TAgentMain<
        [playerId: string, playerSs: string, playerEmail: string],
        { playerId: string; playerSs: string; playerEmail: string }
    >;
}

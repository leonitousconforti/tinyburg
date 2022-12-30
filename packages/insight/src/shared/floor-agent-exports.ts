import type { TAgentMain } from "./agent-main-export.js";

export interface IFloorAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

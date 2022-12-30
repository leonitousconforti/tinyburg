import type { TAgentMain } from "./agent-main-export.js";

export interface IPetAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

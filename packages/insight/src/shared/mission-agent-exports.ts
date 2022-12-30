import type { TAgentMain } from "./agent-main-export.js";

export interface IMissionAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

import type { TAgentMain } from "./agent-main-export.js";

export interface IBitbookAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

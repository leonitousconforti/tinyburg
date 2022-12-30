import type { TAgentMain } from "./agent-main-export.js";

export interface IRoofAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

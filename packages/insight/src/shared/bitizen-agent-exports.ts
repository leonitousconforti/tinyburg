import type { TAgentMain } from "./agent-main-export.js";

export interface IBitizenAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

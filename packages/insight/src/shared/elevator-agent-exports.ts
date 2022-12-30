import type { TAgentMain } from "./agent-main-export.js";

export interface IElevatorAgentExports {
    main: TAgentMain<[], string>;
    mainProducesSourceCode: boolean;
}

import type { TAgentMain } from "./agent-main-export.js";

export interface IGoodAgentExports {
    main: TAgentMain<[string], [number, string]>;
}

import type { TAgentMain } from "./agent-main-export.js";

export interface ITargetFpsAgentExports {
    main: TAgentMain<[fps: number], { fps: number }>;
}

import type { TAgentMain } from "./agent-main-export.js";

export type TCallback = (eventData: string) => unknown;

export interface IElevatorRiderAgentExports {
    main: TAgentMain<[TCallback], void>;
}

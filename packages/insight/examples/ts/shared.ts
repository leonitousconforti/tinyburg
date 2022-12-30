import type Emittery from "emittery";
import type { TAgentMain } from "../../src/shared/agent-main-export.js";

export interface IYourAgentExports {
    main: TAgentMain<[], {}>;
}

export interface IIsMusicEnabledAgentExports {
    main: TAgentMain<[], { musicEnabled: boolean }>;
}

export interface ISetMusicEnabledAgentExports {
    main: TAgentMain<[musicEnabled: boolean], { musicEnabled: boolean }>;
}

export interface ISubscribeToMusicStatusAgent1 {
    main: TAgentMain<[notificationCallback: (status: boolean) => void], void>;
}

export interface ISubscribeToMusicStatusAgent2Events {
    musicStatusChanged: boolean;
}
export interface ISubscribeToMusicStatusAgent2 {
    main: TAgentMain<[], Emittery<ISubscribeToMusicStatusAgent2Events>>;
}

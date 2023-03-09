import type Emittery from "emittery";

import type { TAgentMain } from "../../src/shared/agent-main-export.js";

export interface IYourAgentExports {
    main: TAgentMain<[], { version: string }>;
}

export interface IIsMusicEnabledAgentExports {
    main: TAgentMain<[], { musicEnabled: boolean }>;
}

export interface ISetMusicEnabledAgentExports {
    main: TAgentMain<[musicEnabled: boolean], { musicEnabled: boolean }>;
}

export interface ISubscribeToMusicStatusAgent1Exports {
    main: TAgentMain<[notificationCallback: (status: boolean) => void], void>;
}

export interface ISubscribeToMusicStatusAgent2Events {
    musicStatusChanged: boolean;
}
export interface ISubscribeToMusicStatusAgent2Exports {
    main: TAgentMain<[], Emittery<ISubscribeToMusicStatusAgent2Events>>;
}

export interface IAgent {
    agentFile: string;
    rpcTypes: {
        main: TAgentMain<any[], unknown>;
        mainProducesSourceCode?: boolean;
    };
}

export type TAgentMain<Parameters extends unknown[], ReturnType extends unknown> = (
    ...parameters: Parameters
) => Promise<ReturnType>;

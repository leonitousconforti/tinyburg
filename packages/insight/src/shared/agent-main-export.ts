export interface IAgent {
    agentSource: string;
    rpcTypes: {
        main: TAgentMain<Array<any>, unknown>;
    };
}

export type TAgentMain<Parameters extends Array<unknown>, ReturnType> = (
    ...parameters: Parameters
) => Promise<ReturnType>;

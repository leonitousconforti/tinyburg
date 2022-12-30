import "frida-il2cpp-bridge";

import type { ITargetFpsAgentExports } from "../shared/target-fps-agent-exports.js";

import { TinyTowerFridaAgent } from "../shared/base-frida-agent.js";

export class SetTargetFps extends TinyTowerFridaAgent<SetTargetFps> {
    private readonly _fps: number;

    public constructor(fps: number, loadDependenciesMaxRetries?: number, loadDependenciesWaitMs?: number) {
        super(loadDependenciesMaxRetries, loadDependenciesWaitMs);
        this._fps = fps;
    }

    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const ApplicationClass = csharpAssembly.image.class("Application");
        const setTargetFpsMethod = ApplicationClass.method<void>("set_targetFrameRate", 1);

        return {
            ApplicationClass: {
                dependency: ApplicationClass,
                meta: { callStaticConstructor: false },
            },
            setTargetFpsMethod,
        };
    }

    public retrieveData() {
        this.dependencies.setTargetFpsMethod.invoke(this._fps);
        return { fps: this._fps };
    }

    public transformToSourceCode() {
        return "";
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: ITargetFpsAgentExports = {
    main: async (fps) => {
        const instance = await new SetTargetFps(fps).start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;

import "frida-il2cpp-bridge";

import type { IGetTowerCredentialsAgentExports } from "../src/shared/tower-credentials-agent-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class GetTowerCredentials extends TinyTowerFridaAgent<GetTowerCredentials> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const NBSyncClass = csharpAssembly.image.class("NBSync");
        const PlayerIdField = NBSyncClass.field<Il2Cpp.String>("playerID");
        const PlayerSsField = NBSyncClass.field<Il2Cpp.String>("playerSalt");
        const PlayerEmailField = NBSyncClass.field<Il2Cpp.String>("playerEmail");

        return {
            NBSyncClass: {
                dependency: NBSyncClass,
                meta: { callStaticConstructor: true },
            },
            PlayerIdField,
            PlayerSsField,
            PlayerEmailField,
        };
    }

    public retrieveData() {
        const playerId: string | null = this.dependencies.PlayerIdField.value.content;
        const playerSs: string | null = this.dependencies.PlayerSsField.value.content;
        const playerEmail: string | null = this.dependencies.PlayerEmailField.value.content;

        if (!playerId) throw new Error("Could not read playerId");
        if (!playerSs) throw new Error("Could not read playerSs");

        return {
            playerId,
            playerSs,
            playerEmail: playerEmail || undefined,
        };
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IGetTowerCredentialsAgentExports = {
    main: async () => {
        const instance = await new GetTowerCredentials().start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;

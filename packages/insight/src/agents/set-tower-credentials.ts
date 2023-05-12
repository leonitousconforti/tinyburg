import "frida-il2cpp-bridge";

import type { ITowerCredentialsAgentExports } from "../shared/tower-credentials-agent-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class SetTowerCredentials extends TinyTowerFridaAgent<SetTowerCredentials> {
    private readonly _playerId: string;
    private readonly _playerSs: string;
    private readonly _playerEmail: string;

    public constructor(
        playerId: string,
        playerSs: string,
        playerEmail: string,
        loadDependenciesMaxRetries?: number,
        loadDependenciesWaitMs?: number
    ) {
        super(loadDependenciesMaxRetries, loadDependenciesWaitMs);
        this._playerId = playerId;
        this._playerSs = playerSs;
        this._playerEmail = playerEmail;
    }

    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const NBSyncClass = csharpAssembly.image.class("NBSync");
        const PlayerIdField = NBSyncClass.field<Il2Cpp.String>("playerID");
        const PlayerSsField = NBSyncClass.field<Il2Cpp.String>("playerSalt");
        const PlayerEmailField = NBSyncClass.field<Il2Cpp.String>("playerEmail");
        const SwitchRegisteredPlaterMethod = NBSyncClass.method<void>("switchRegisteredPlater", 4);

        return {
            NBSyncClass: {
                dependency: NBSyncClass,
                meta: { callStaticConstructor: true },
            },
            PlayerIdField,
            PlayerSsField,
            PlayerEmailField,
            SwitchRegisteredPlaterMethod,
        };
    }

    public retrieveData() {
        this.dependencies.SwitchRegisteredPlaterMethod.invoke(
            Il2Cpp.string(this._playerId),
            Il2Cpp.string(this._playerSs),
            Il2Cpp.string(this._playerEmail),
            true
        );

        return {
            playerId: this.dependencies.PlayerIdField.value.content || "unknown",
            playerSs: this.dependencies.PlayerSsField.value.content || "unknown",
            playerEmail: this.dependencies.PlayerEmailField.value.content || "unknown",
        };
    }

    public transformToSourceCode() {
        return "";
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: ITowerCredentialsAgentExports = {
    main: async (playerId, playerSs, playerEmail) => {
        const instance = await new SetTowerCredentials(playerId, playerSs, playerEmail).start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;

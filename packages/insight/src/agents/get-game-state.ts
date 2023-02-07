import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class GetGameState extends TinyTowerFridaAgent<GetGameState> {
    public loadDependencies() {
        return {};
    }

    public retrieveData() {
        return {};
    }
}

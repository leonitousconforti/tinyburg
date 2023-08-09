import { TinyTowerFridaAgent } from "@tinyburg/insight/dist/src/agents/base-frida-agent";

export class ExplorerAgent extends TinyTowerFridaAgent<ExplorerAgent> {
    public override loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        return { AppUtilClass };
    }

    public override retrieveData() {
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;
        return { TTVersion: version || "unknown" };
    }
}

(async function main() {
    const agent = await new ExplorerAgent().start();
    send(agent.data.TTVersion);
})();

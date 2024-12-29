/**
 * Built-in agents that can be used in the game.
 *
 * @since 1.0.0
 */

import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import * as Effect from "effect/Effect";
import * as FridaCompile from "frida-compile";
import { getNodeSystem } from "frida-compile/dist/system/node.js";

import type { IAgent } from "./shared/agent-main-export.js";
import type { IBadAgentExports } from "./shared/bad-agent-exports.js";
import type { IBitbookAgentExports } from "./shared/bitbook-agent-exports.js";
import type { IBitizenAgentExports } from "./shared/bitizen-agent-exports.js";
import type { ICostumeAgentExports } from "./shared/costume-agent-exports.js";
import type { IElevatorAgentExports } from "./shared/elevator-agent-exports.js";
import type { IElevatorRiderAgentExports } from "./shared/elevator-rider.js";
import type { IFloorAgentExports } from "./shared/floor-agent-exports.js";
import type { IGameStateAgentExports } from "./shared/game-state-exports.js";
import type { IGoodAgentExports } from "./shared/good-agent-exports.js";
import type { IMissionAgentExports } from "./shared/mission-agent-exports.js";
import type { IPetAgentExports } from "./shared/pet-agent-exports.js";
import type { IRoofAgentExports } from "./shared/roof-agent-exports.js";
import type { ITargetFpsAgentExports } from "./shared/target-fps-agent-exports.js";
import type {
    IGetTowerCredentialsAgentExports,
    ISetTowerCredentialsAgentExports,
} from "./shared/tower-credentials-agent-exports.js";

/** @internal */
const compile = (agent: string): Effect.Effect<string, never, Path.Path | FileSystem.FileSystem> =>
    Effect.gen(function* () {
        const path = yield* Path.Path;
        const fs = yield* FileSystem.FileSystem;

        // Create a temporary directory for frida compiler
        const tempDirectory = yield* fs.makeTempDirectory();
        const insightProject = yield* path.fromFileUrl(new URL("../", import.meta.url));

        // Recreate project structure in temp directory
        yield* fs.symlink(path.join(insightProject, "src"), path.join(tempDirectory, "src"));
        yield* fs.symlink(path.join(insightProject, "agents"), path.join(tempDirectory, "agents"));
        yield* fs.symlink(path.join(insightProject, "node_modules"), path.join(tempDirectory, "node_modules"));
        yield* fs.symlink(path.join(insightProject, "package.json"), path.join(tempDirectory, "package.json"));

        // Write new compiler options
        const tsconfig = {
            compilerOptions: {
                target: "ES2020",
                module: "ES2020",
                moduleResolution: "Node16",
                allowSyntheticDefaultImports: true,
                resolveJsonModule: true,
                allowJs: true,
                strict: true,
            },
        };
        yield* fs.writeFileString(path.join(tempDirectory, "tsconfig.json"), JSON.stringify(tsconfig, null, 4));

        // Compile the agent script
        const tsSystem = getNodeSystem();
        const assets = FridaCompile.queryDefaultAssets(tempDirectory, tsSystem);
        const buildOptions: FridaCompile.BuildOptions = {
            assets,
            system: tsSystem,
            compression: "terser",
            sourceMaps: "included",
            projectRoot: tempDirectory,
            entrypoint: path.join(tempDirectory, "agents", `${agent}.ts`),
        };
        return yield* Effect.try(() => FridaCompile.build(buildOptions));
    })
        .pipe(Effect.scoped)
        .pipe(Effect.orDie);

/**
 * @since 1.0.0
 * @category Agents
 */
export const GetterAgents = {
    BitbookAgent: Effect.map(
        compile("get-bitbook-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IBitbookAgentExports }) satisfies IAgent
    ),
    BitizenAgent: Effect.map(
        compile("get-bitizen-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IBitizenAgentExports }) satisfies IAgent
    ),
    CostumeAgent: Effect.map(
        compile("get-costume-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as ICostumeAgentExports }) satisfies IAgent
    ),
    ElevatorAgent: Effect.map(
        compile("get-elevator-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IElevatorAgentExports }) satisfies IAgent
    ),
    FloorAgent: Effect.map(
        compile("get-floor-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IFloorAgentExports }) satisfies IAgent
    ),
    MissionAgent: Effect.map(
        compile("get-mission-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IMissionAgentExports }) satisfies IAgent
    ),
    PetAgent: Effect.map(
        compile("get-pet-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IPetAgentExports }) satisfies IAgent
    ),
    RoofAgent: Effect.map(
        compile("get-roof-data"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IRoofAgentExports }) satisfies IAgent
    ),
    GetTowerCredentialsAgent: Effect.map(
        compile("get-tower-credentials"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IGetTowerCredentialsAgentExports }) satisfies IAgent
    ),
    GetGameStateAgent: Effect.map(
        compile("get-game-state"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IGameStateAgentExports }) satisfies IAgent
    ),
} as const;

/**
 * @since 1.0.0
 * @category Agents
 */
export const SetterAgents = {
    SetFpsAgent: Effect.map(
        compile("set-target-fps"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as ITargetFpsAgentExports }) satisfies IAgent
    ),
    SetTowerCredentialsAgent: Effect.map(
        compile("set-tower-credentials"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as ISetTowerCredentialsAgentExports }) satisfies IAgent
    ),
} as const;

/**
 * @since 1.0.0
 * @category Agents
 */
export const AlertAgents = {
    ElevatorRider: Effect.map(
        compile("alert-elevator-rider"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IElevatorRiderAgentExports }) satisfies IAgent
    ),
};

/**
 * @since 1.0.0
 * @category Agents
 */
export const TestingAgents = {
    BadAgent: Effect.map(
        compile("bad-agent"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IBadAgentExports }) satisfies IAgent
    ),
    GoodAgent: Effect.map(
        compile("good-agent"),
        (agentSource) => ({ agentSource, rpcTypes: {} as unknown as IGoodAgentExports }) satisfies IAgent
    ),
};

/**
 * @since 1.0.0
 * @category Agents
 */
export const AllAgents = {
    ...GetterAgents,
    ...SetterAgents,
    ...AlertAgents,
    ...TestingAgents,
} as const;

/**
 * Provides information into and about TinyTower using frida.
 *
 * @since 1.0.0
 */

import * as PlatformError from "@effect/platform/Error";
import * as Path from "@effect/platform/Path";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Scope from "effect/Scope";
import * as Frida from "frida";

import * as FridaEffect from "./Frida.js";
import type { IAgent } from "./shared/agent-main-export.js";

/**
 * @since 1.0.0
 * @category Insight
 */
export const runAgent =
    <T extends IAgent>(agent: T) =>
    (
        ..._arguments: Parameters<T["rpcTypes"]["main"]>
    ): Effect.Effect<
        Awaited<ReturnType<T["rpcTypes"]["main"]>>,
        Cause.UnknownException | PlatformError.PlatformError,
        Path.Path | FridaEffect.FridaDevice | Scope.Scope
    > =>
        Effect.gen(function* () {
            // Attach to the process and inject the agent script
            const { attach, createScript, device, spawn } = yield* FridaEffect.FridaDevice;
            const pid = yield* spawn("com.nimblebit.tinytower");
            const session = yield* attach(pid, { realm: Frida.Realm.Emulated });
            const script = yield* createScript(session, agent.agentSource);

            // script.message.connect(function onMessage(message: Frida.Message) {
            //     if (message.type === "error") {
            //         console.error(message.description);
            //     } else {
            //         console.log(message.payload);
            //     }
            // });
            yield* Effect.tryPromise(() => device.resume(pid));

            // Run the agent script
            const main: T["rpcTypes"]["main"] = (script.exports as T["rpcTypes"])["main"];
            const data = yield* Effect.tryPromise(() => main(..._arguments));
            return data as Awaited<ReturnType<T["rpcTypes"]["main"]>>;
        });

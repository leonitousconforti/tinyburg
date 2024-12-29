/**
 * Provides information into and about TinyTower using frida.
 *
 * @since 1.0.0
 */

import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Scope from "effect/Scope";
import * as frida from "frida";

import * as FridaEffect from "./Frida.js";
import type { IAgent } from "./internal/shared/agent-main-export.js";

/**
 * @since 1.0.0
 * @category Insight
 */
export const runAgent =
    <T extends IAgent>(_agent: T) =>
    (
        ..._arguments: Parameters<T["rpcTypes"]["main"]>
    ): Effect.Effect<
        Awaited<ReturnType<T["rpcTypes"]["main"]>>,
        Cause.UnknownException,
        FridaEffect.FridaDevice | Scope.Scope
    > =>
        Effect.gen(function* () {
            const { attach, createScript, device, spawn } = yield* FridaEffect.FridaDevice;
            const pid = yield* spawn("com.nimblebit.tinytower");
            const session = yield* attach(pid, { realm: frida.Realm.Native });
            const script = yield* createScript(session, "");
            yield* Effect.tryPromise(() => device.resume(pid));

            const main: T["rpcTypes"]["main"] = (script.exports as T["rpcTypes"])["main"];
            const data = yield* Effect.tryPromise(() => main(..._arguments));
            return data as Awaited<ReturnType<T["rpcTypes"]["main"]>>;
        });

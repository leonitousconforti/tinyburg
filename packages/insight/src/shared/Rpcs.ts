/**
 * The RPCs every game's agent serves, whatever the game. A game's own RPCs
 * merge onto these: `Rpcs.merge(RpcGroup.make(...))`.
 *
 * @since 1.0.0
 */

import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

/**
 * - `Version`: the game's version, as Unity's `Application.version` gives it.
 * - `SetFps`: sets Unity's target frame rate. A low one leaves the emulator
 *   more time for the agent.
 *
 * @since 1.0.0
 * @category Rpcs
 */
export class Rpcs extends RpcGroup.make(
    Rpc.make("Version", {
        success: Schema.String,
    }),
    Rpc.make("SetFps", {
        payload: Schema.Finite,
        success: Schema.Void,
    })
) {}

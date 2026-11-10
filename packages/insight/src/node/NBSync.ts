/**
 * Runs any Nimblebit Unity game under a generic NBSync agent and records what
 * it says to Nimblebit's sync server: every web request with its response,
 * every hash it computes (so the signed preimages), every call into its
 * NBSync classes, and the shape of those classes.
 *
 * The run contains secrets: the game's signing secrets (in `statics` and in
 * the hashed inputs among `events`) and the throwaway player's auth key. Keep
 * raw runs out of anything shared; `Conformance` redacts them.
 *
 * @since 1.0.0
 */

import type { Scope } from "effect";
import type { RpcClientError } from "effect/rpc";

import { Clock, Duration, Effect, Layer, Schedule, Schema } from "effect";
import { RpcClient, RpcSerialization } from "effect/rpc";

import { FridaDevice, FridaScript, FridaSession, FridaSessionError } from "@efffrida/frida-tools";
import { FridaRpcClient } from "@efffrida/rpc/node";
import { JsPlatform, Realm } from "frida";

import { ClassInfo, Classes, DriveResult, NBSyncRpcs, TapEvent, TapEvents } from "../shared/NBSyncRpcs.ts";

/**
 * Everything one run of a game recorded.
 *
 * @since 1.0.0
 * @category Models
 */
export class ProbeRun extends Schema.Class<ProbeRun, { readonly brand: unique symbol }>("ProbeRun")({
    bundleIdentifier: Schema.String,
    playerId: Schema.NullOr(Schema.String),
    events: Schema.Array(TapEvent),
    classes: Schema.Array(ClassInfo),
    statics: Schema.Record(Schema.String, Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown))),
    drive: Schema.Array(DriveResult),
}) {}

const ProtocolLive = Layer.provide(FridaRpcClient.layerProtocolFrida(), RpcSerialization.layerNdjson);

/**
 * Spawns the game suspended, attaches in the emulated realm (the games ship
 * only ARM libraries), loads the NBSync agent and only then lets the game run,
 * so the agent's hooks are in before the game's first request.
 *
 * @since 1.0.0
 * @category Frida
 */
export const layerAgent = (
    bundleIdentifier: string
): Layer.Layer<
    FridaScript.FridaScript | FridaSession.FridaSession | RpcClient.Protocol,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> => {
    const Spawned = Layer.unwrap(
        Effect.gen(function* () {
            const { device } = yield* FridaDevice.FridaDevice;
            const pid = yield* Effect.tryPromise({
                try: () => device.spawn(bundleIdentifier),
                catch: (cause) => new FridaSessionError.FridaSessionError({ cause, when: "spawn" }),
            });
            return FridaSession.layer(pid, { realm: Realm.Emulated });
        })
    );
    const Loaded = Layer.provideMerge(
        FridaScript.layer(new URL("../frida/NBSyncAgent.ts", import.meta.url), { platform: JsPlatform.Browser }),
        Spawned
    );
    const Resumed = Layer.effectDiscard(
        Effect.gen(function* () {
            const { device } = yield* FridaDevice.FridaDevice;
            const { pid } = yield* FridaSession.FridaSession;
            yield* Effect.tryPromise({
                try: () => device.resume(pid),
                catch: (cause) => new FridaSessionError.FridaSessionError({ cause, when: "resume" }),
            });
        })
    );
    return Layer.provideMerge(Resumed, Layer.provideMerge(ProtocolLive, Loaded));
};

/**
 * @since 1.0.0
 * @category Models
 */
export interface ProbeOptions {
    /** How long the game runs on its own before anything is driven. */
    readonly settle?: Duration.Input | undefined;
    /** Whether to call the game's read-only NBSync methods. */
    readonly drive?: boolean | undefined;
    /**
     * Whether to also describe the game's network and sync classes (fields
     * and methods). Off by default: on a large game it is slow under the ARM
     * translator (18 minutes for LEGO Tower).
     */
    readonly classes?: boolean | undefined;
    /** How long each driven call gets for its requests before the next. */
    readonly driveInterval?: Duration.Input | undefined;
}

/**
 * Records one run of the game the agent is loaded into: its launch traffic,
 * then (unless disabled) each read-only NBSync method it has, called once with
 * the game's own player.
 *
 * A failing driven call (the game crashing, say) ends the driving early; the
 * run keeps what was recorded until then.
 *
 * @since 1.0.0
 * @category Probe
 */
export const probe = Effect.fnUntraced(function* (
    bundleIdentifier: string,
    options?: ProbeOptions
): Effect.fn.Return<ProbeRun, RpcClientError.RpcClientError | Schema.SchemaError, RpcClient.Protocol | Scope.Scope> {
    const client = yield* RpcClient.make(NBSyncRpcs);
    const events: Array<TapEvent> = [];
    const take = client.TakeEvents().pipe(
        Effect.flatMap(Schema.decodeEffect(TapEvents)),
        Effect.map((taken) => void events.push(...taken))
    );

    const status = yield* client.Status().pipe(
        Effect.repeat({
            schedule: Schedule.spaced("1 second"),
            until: (status) => status.tapped || status.error !== null,
        }),
        Effect.timeoutOrElse({
            duration: "4 minutes",
            orElse: () => Effect.die(new Error("The NBSync agent did not hook the game within 4 minutes")),
        })
    );
    if (status.error !== null)
        return yield* Effect.die(new Error(`The NBSync agent could not hook the game: ${status.error}`));
    yield* Effect.logInfo(`NBSync agent hooked ${status.hooked} methods, letting ${bundleIdentifier} start up`);

    yield* Effect.sleep(options?.settle ?? "45 seconds");
    // Each call into the agent is timed: under the ARM translator a slow one
    // can take minutes, and this shows which
    const timed = <A, E, R>(what: string, effect: Effect.Effect<A, E, R>) =>
        Effect.timed(effect).pipe(
            Effect.tap(([took]) => Effect.logInfo(`${what} took ${Duration.format(took)}`)),
            Effect.map(([, value]) => value)
        );
    yield* timed("Taking the launch traffic", take);
    const classes =
        options?.classes === true
            ? yield* timed(
                  "Reading the game's classes",
                  client.Dump().pipe(Effect.flatMap(Schema.decodeEffect(Classes)))
              )
            : [];
    const statics = {
        NBSync: yield* timed("Reading NBSync's statics", client.Statics({ className: "NBSync" })),
        NBSyncItems: yield* timed("Reading NBSyncItems' statics", client.Statics({ className: "NBSyncItems" })),
    };
    const playerId = yield* timed("Reading the player id", client.PlayerId());

    const drive: Array<typeof DriveResult.Type> = [];
    if (playerId !== null && options?.drive !== false) {
        const plan = yield* timed("Planning the driven calls", client.DrivePlan({ ownId: playerId }));
        yield* Effect.logInfo(
            `Driving ${plan.filter((step) => step.runnable).length} read-only NBSync methods as player ${playerId}`
        );
        for (const { label } of plan.filter((step) => step.runnable)) {
            // Whatever came in since the last take happened before this call
            const alive = yield* take.pipe(
                Effect.as(true),
                Effect.orElseSucceed(() => false)
            );
            if (!alive) break;
            const t = yield* Clock.currentTimeMillis;
            events.push(
                new TapEvent({
                    id: -1,
                    kind: "drive",
                    tag: "drive",
                    key: label,
                    self: null,
                    params: null,
                    ret: null,
                    t,
                })
            );
            const result = yield* client.Drive({ ownId: playerId, label }).pipe(
                Effect.timeoutOrElse({
                    duration: "1 minute",
                    orElse: () => Effect.succeed({ label, invoked: false, error: "timed out" }),
                }),
                Effect.catch((error) => Effect.succeed({ label, invoked: false, error: String(error) }))
            );
            drive.push(result);
            yield* Effect.logInfo(`${label}: ${result.invoked ? "called" : result.error}`);
            yield* Effect.sleep(options?.driveInterval ?? "8 seconds");
        }
        // The last driven call's requests get a little longer to finish
        yield* Effect.sleep(Duration.seconds(15));
    }
    yield* take.pipe(Effect.ignore);

    return new ProbeRun({ bundleIdentifier, playerId, events, classes, statics, drive });
});

/**
 * Interacting with Frida resources.
 *
 * @since 1.0.0
 */

import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as Frida from "frida";

/** @internal */
export const FridaDeviceTypeId: unique symbol = Symbol.for("@tinyburg/insight/Frida/FridaDevice") as FridaDeviceTypeId;

/** @internal */
export type FridaDeviceTypeId = typeof FridaDeviceTypeId;

/** @internal */
export interface FridaDevice {
    readonly device: Frida.Device;

    readonly spawn: (
        program: string | Array<string>,
        options?: Frida.SpawnOptions | undefined
    ) => Effect.Effect<number, Cause.UnknownException, Scope.Scope>;

    readonly attach: (
        target: Frida.TargetProcess,
        options?: Frida.SessionOptions | undefined
    ) => Effect.Effect<Frida.Session, Cause.UnknownException, Scope.Scope>;

    readonly createScript: (
        session: Frida.Session,
        source: string,
        options?: Frida.ScriptOptions | undefined
    ) => Effect.Effect<Frida.Script, Cause.UnknownException, Scope.Scope>;

    readonly [FridaDeviceTypeId]: typeof FridaDeviceTypeId;
}

/** @internal */
export const FridaDevice = Context.GenericTag<FridaDevice>("@tinyburg/insight/Frida/FridaDevice");

/** @internal */
export const releaseDevice = (_device: FridaDevice): Effect.Effect<void, never, never> => Effect.void;

/** @internal */
export const spawn =
    (device: Frida.Device) =>
    (
        program: string | Array<string>,
        options?: Frida.SpawnOptions | undefined
    ): Effect.Effect<number, Cause.UnknownException, Scope.Scope> =>
        Effect.acquireRelease(
            Effect.tryPromise(() => device.spawn(program, options)),
            (pid) => Effect.promise(() => device.kill(pid))
        );

/** @internal */
export const attach =
    (device: Frida.Device) =>
    (
        target: Frida.TargetProcess,
        options?: Frida.SessionOptions | undefined
    ): Effect.Effect<Frida.Session, Cause.UnknownException, Scope.Scope> =>
        Effect.acquireRelease(
            Effect.tryPromise(() => device.attach(target, options)),
            (session) => Effect.promise(() => session.detach())
        );

/** @internal */
export const createScript = (
    session: Frida.Session,
    source: string,
    options?: Frida.ScriptOptions | undefined
): Effect.Effect<Frida.Script, Cause.UnknownException, Scope.Scope> =>
    Effect.acquireRelease(
        Effect.tryPromise(async () => {
            const script = await session.createScript(source, options);
            await script.load();
            return script;
        }),
        (script) => Effect.promise(() => script.unload())
    );

/** @internal */
export const acquireUsbDevice = (
    options?: Frida.GetDeviceOptions | undefined
): Effect.Effect<FridaDevice, Cause.UnknownException, never> =>
    Effect.map(
        Effect.tryPromise(() => Frida.getUsbDevice(options)),
        (device) =>
            ({
                [FridaDeviceTypeId]: FridaDeviceTypeId,
                device,
                createScript,
                spawn: spawn(device),
                attach: attach(device),
            }) as const
    );

/** @internal */
export const acquireFridaRemoteDevice = (
    address: string,
    options?: Frida.RemoteDeviceOptions | undefined
): Effect.Effect<FridaDevice, Cause.UnknownException, never> =>
    Effect.map(
        Effect.tryPromise(() => Frida.getDeviceManager().addRemoteDevice(address, options)),
        (device) =>
            ({
                [FridaDeviceTypeId]: FridaDeviceTypeId,
                device,
                createScript,
                spawn: spawn(device),
                attach: attach(device),
            }) as const
    );

/**
 * @since 1.0.0
 * @category Layers
 */
export const RemoteDeviceLayer = (
    address: string,
    options?: Frida.RemoteDeviceOptions | undefined
): Layer.Layer<FridaDevice, Cause.UnknownException, never> =>
    Layer.scoped(FridaDevice, Effect.acquireRelease(acquireFridaRemoteDevice(address, options), releaseDevice));

/**
 * @since 1.0.0
 * @category Layers
 */
export const UsbDeviceLayer = (
    options?: Frida.GetDeviceOptions | undefined
): Layer.Layer<FridaDevice, Cause.UnknownException, never> =>
    Layer.scoped(FridaDevice, Effect.acquireRelease(acquireUsbDevice(options), releaseDevice));

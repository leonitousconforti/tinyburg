import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Effect, Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/rpc";

import { FridaRuntime } from "@efffrida/platform";
import { FridaRpcServer } from "@efffrida/rpc/frida";

import { type ClassInfo, type DriveResult, NBSyncRpcs, type TapEvent } from "../shared/NBSyncRpcs.ts";

/**
 * A game-agnostic agent for Nimblebit's Unity games. It hooks UnityWebRequest,
 * WWW, WWWForm, HashAlgorithm.ComputeHash and every method of the game's
 * NBSync* classes as soon as il2cpp is initialised, before any game code runs,
 * and buffers one event per call for the node side to take.
 *
 * Two things about Android's ARM translation shape this agent:
 * - The JS thread must not stay attached to il2cpp: the game's next garbage
 *   collection then crashes it. Every call from the JS thread uses the "free"
 *   flag, which detaches afterwards.
 * - A managed exception thrown into Frida (by a method it called, or through a
 *   hook) aborts the game, so driven methods get real no-op delegates rather
 *   than null callbacks, and third-party login flows are not driven.
 */

type Json = null | boolean | number | string | Array<Json> | { [key: string]: Json };

const DEFAULT_CAP = 40;
const HOT_CAP = 3000;
const MAX_STRING = 16_384;
const MAX_BUFFERED = 100_000;

/** Members of frida-il2cpp-bridge that its typings keep internal. */
interface MethodInternals {
    readonly nativeSignatureHasInstanceSlot: boolean;
    readonly nativeFunction: NativeFunction<any, any>;
}
interface Il2CppInternals {
    readonly fromFridaValue: (value: unknown, type: Il2Cpp.Type) => unknown;
}
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const internals = (method: Il2Cpp.Method): MethodInternals => method as unknown as MethodInternals;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const fromFridaValue = (Il2Cpp as unknown as Il2CppInternals).fromFridaValue;

let seq = 0;
const buffer: Array<typeof TapEvent.Encoded> = [];
const counts = new Map<string, number>();
let tapped = false;
let tapError: string | null = null;
let hooked = 0;

const record = (event: Omit<typeof TapEvent.Encoded, "t">): void => {
    if (buffer.length < MAX_BUFFERED) buffer.push({ ...event, t: Date.now() });
};

const clip = (s: string): string => (s.length > MAX_STRING ? `${s.slice(0, MAX_STRING)}...<${s.length}>` : s);

/** Renders an il2cpp value as JSON without calling into managed code that could throw. */
const render = (value: unknown, type: Il2Cpp.Type, depth = 0): Json => {
    try {
        if (value === undefined || value === null) return null;
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return type.class.isEnum ? { enum: type.name, value } : value;
        if (value instanceof Int64 || value instanceof UInt64) return value.toString();
        if (value instanceof Il2Cpp.String) return value.isNull() ? null : clip(value.content ?? "");
        if (value instanceof Il2Cpp.Array) {
            if (value.isNull()) return null;
            if (value.elementType.name === "System.Byte") {
                const bytes = new Uint8Array(
                    value.handle.add(Il2Cpp.Array.headerSize).readByteArray(Math.min(value.length, MAX_STRING)) ?? []
                );
                const printable = bytes.every((b) => (b >= 32 && b <= 126) || (b >= 9 && b <= 13));
                if (printable) return { bytes: value.length, text: clip(String.fromCharCode(...bytes)) };
                const hex = Array.from(bytes.slice(0, 64), (b) => b.toString(16).padStart(2, "0")).join("");
                return { bytes: value.length, hex };
            }
            if (depth > 1) return `${value.elementType.name}[${value.length}]`;
            const out: Array<Json> = [];
            for (const element of value) {
                if (out.length >= 32) break;
                out.push(render(element, value.elementType, depth + 1));
            }
            return out;
        }
        if (value instanceof Il2Cpp.ValueType) {
            if (!value.type.class.isEnum) return { valueType: value.type.name };
            const raw = value.field<number>("value__").value;
            return { enum: value.type.name, value: raw };
        }
        if (value instanceof Il2Cpp.Object) {
            if (value.isNull()) return null;
            const name = value.class.type.name;
            if (depth < 2 && name === "System.Collections.Generic.List<System.String>") {
                const items = value.method<Il2Cpp.Array>("ToArray").invoke();
                return { class: name, items: render(items, items.object.class.type, depth + 1) };
            }
            return { class: name, handle: value.handle.toString() };
        }
        if (value instanceof NativePointer) return value.toString();
        return typeof value === "string" ? value : null;
    } catch (error) {
        return `<render error ${String(error)}>`;
    }
};

type SelfReader = (self: Il2Cpp.Object) => Json;

const tryInvoke = (object: Il2Cpp.Object, name: string): Il2Cpp.Method.ReturnType | undefined => {
    try {
        return object.tryMethod(name)?.invoke();
    } catch {
        return undefined;
    }
};

const readWebRequest: SelfReader = (request) => {
    const url = tryInvoke(request, "get_url");
    const method = tryInvoke(request, "get_method");
    const downloadHandler = tryInvoke(request, "get_downloadHandler");
    return {
        request: request.handle.toString(),
        url: url instanceof Il2Cpp.String ? url.content : null,
        method: method instanceof Il2Cpp.String && !method.isNull() ? method.content : null,
        downloadHandler:
            downloadHandler instanceof Il2Cpp.Object && !downloadHandler.isNull()
                ? downloadHandler.handle.toString()
                : null,
    };
};
const readHandle: SelfReader = (object) => ({ handle: object.handle.toString() });
const readWWW: SelfReader = (www) => {
    const url = tryInvoke(www, "get_url");
    return { www: www.handle.toString(), url: url instanceof Il2Cpp.String ? url.content : null };
};

/**
 * Replaces a method with a wrapper that records its parameters and return
 * value. `selfAfter` reads `this` after the call, for constructors.
 */
const hook = (method: Il2Cpp.Method, tag: string, cap: number, readSelf?: SelfReader, selfAfter = false): boolean => {
    if (method.virtualAddress.isNull() || method.isGeneric) return false;
    const key = `${method.class.type.name}::${method.name}(${method.parameters.map((p) => p.type.name).join(",")})`;
    const { nativeFunction, nativeSignatureHasInstanceSlot } = internals(method);
    const offset = nativeSignatureHasInstanceSlot ? 1 : 0;
    const describeSelf = (args: Array<unknown>): Json => {
        if (readSelf === undefined || method.isStatic || offset === 0) return null;
        const self = args[0];
        if (!(self instanceof NativePointer)) return null;
        try {
            return readSelf(new Il2Cpp.Object(self));
        } catch {
            return null;
        }
    };
    try {
        // NativeCallback's typings want any here: its arguments and result vary per method
        const callback = function (...args: Array<any>): any {
            const n = (counts.get(key) ?? 0) + 1;
            counts.set(key, n);
            const recording = n <= cap;
            const id = ++seq;
            if (recording) {
                const params: Record<string, Json> = {};
                for (const p of method.parameters)
                    params[p.name] = render(fromFridaValue(args[p.position + offset], p.type), p.type);
                record({ id, kind: "enter", tag, key, self: selfAfter ? null : describeSelf(args), params, ret: null });
            }
            const ret: unknown = nativeFunction(...args);
            if (recording) {
                const rendered =
                    ret === undefined ? null : render(fromFridaValue(ret, method.returnType), method.returnType);
                record({
                    id,
                    kind: "leave",
                    tag,
                    key,
                    self: selfAfter ? describeSelf(args) : null,
                    params: null,
                    ret: rendered,
                });
            }
            return ret;
        };
        method.revert();
        Interceptor.replace(
            method.virtualAddress,
            new NativeCallback(callback, method.returnType.fridaAlias, method.fridaSignature)
        );
        return true;
    } catch (error) {
        record({ id: ++seq, kind: "hook-error", tag, key, self: null, params: null, ret: String(error) });
        return false;
    }
};

const SYSTEM_ASSEMBLY = /^(mscorlib|System|Mono\.|UnityEngine|Unity\.|netstandard|__Generated)/;
const INTERESTING_CLASS =
    /NBSync|NBServer|NBNet|Nimble|Sync|Gift|Friend|Snapshot|Trade|Mail|Cloud|Server|Network|Http|Web|Request|Response|Visit|Social|Raffle|Hash|MD5|Crypt|Salt|Save/i;

const findClass = (fullName: string): Il2Cpp.Class | null => {
    for (const assembly of Il2Cpp.domain.assemblies) {
        const klass = assembly.image.tryClass(fullName);
        if (klass !== null) return klass;
    }
    return null;
};

const gameClasses = (predicate: (klass: Il2Cpp.Class) => boolean): Array<Il2Cpp.Class> =>
    Il2Cpp.domain.assemblies
        .filter((assembly) => !SYSTEM_ASSEMBLY.test(assembly.name))
        .flatMap((assembly) => assembly.image.classes.filter(predicate));

const isLambda = (method: Il2Cpp.Method): boolean => /^<.*>b__/.test(method.name) || /<>c/.test(method.class.type.name);

const installTap = (): void => {
    const hookAll = (
        klass: Il2Cpp.Class | null,
        names: ReadonlyArray<string>,
        tag: string,
        readSelf?: SelfReader,
        selfAfter = false
    ) => {
        if (klass === null) return;
        for (const method of klass.methods)
            if (names.includes(method.name) && hook(method, tag, HOT_CAP, readSelf, selfAfter)) hooked++;
    };
    // The web stack first, so even the first request is seen
    hookAll(findClass("UnityEngine.Networking.UnityWebRequest"), ["SendWebRequest"], "web", readWebRequest);
    hookAll(
        findClass("UnityEngine.Networking.UnityWebRequest"),
        ["Get", "Post", "Put", "Delete", "Head"],
        "web-factory"
    );
    hookAll(findClass("UnityEngine.Networking.UploadHandlerRaw"), [".ctor"], "web-body", readHandle);
    hookAll(findClass("UnityEngine.Networking.DownloadHandler"), ["get_text"], "web-response", readHandle);
    hookAll(findClass("UnityEngine.WWW"), [".ctor"], "www", readWWW, true);
    hookAll(findClass("UnityEngine.WWW"), ["get_text"], "www-response", readWWW);
    hookAll(findClass("UnityEngine.WWWForm"), ["AddField"], "form", readHandle);
    hookAll(findClass("System.Security.Cryptography.HashAlgorithm"), ["ComputeHash"], "hash");
    // Compiler-generated classes (iterators, closures) are left alone: an
    // exception Unity would catch in a coroutine aborts the game through a hook
    for (const klass of gameClasses(
        (k) => k.type.name.startsWith("NBSync") && !/[<>]/.test(k.type.name) && !k.isGeneric && !k.isEnum
    )) {
        for (const method of klass.methods) {
            if (isLambda(method)) continue;
            const hot = /^(e|Q|genHash|.*[Hh]ash.*)$/.test(method.name);
            if (hook(method, "nbsync", hot ? HOT_CAP : DEFAULT_CAP)) hooked++;
        }
    }
    tapped = true;
};

// When the agent loads before the game initialises il2cpp, "main" runs this
// inside il2cpp_init on the main thread, so the hooks are in before any game
// code runs. Otherwise it polls until the game's NBSync class exists.
Il2Cpp.perform(() => {
    try {
        if (findClass("NBSync") !== null) return installTap();
        const timer = setInterval(() => {
            void Il2Cpp.perform(() => {
                if (findClass("NBSync") === null) return;
                clearInterval(timer);
                installTap();
            }, "free");
        }, 100);
    } catch (error) {
        tapError = String(error);
    }
}, "main").catch((error: unknown) => {
    tapError = String(error);
});

const describeClass = (klass: Il2Cpp.Class): typeof ClassInfo.Encoded => ({
    assembly: klass.image.assembly.name,
    name: klass.type.name,
    parent: klass.parent?.type.name ?? null,
    isEnum: klass.isEnum,
    fields: klass.fields.map((field) => {
        let value: Json = null;
        if (field.isLiteral || (field.isStatic && klass.isEnum)) {
            try {
                value = render(field.value, field.type);
            } catch {
                value = null;
            }
        }
        return { name: field.name, type: field.type.name, static: field.isStatic, literal: field.isLiteral, value };
    }),
    methods: klass.methods.map((method) => ({
        name: method.name,
        static: method.isStatic,
        returns: method.returnType.name,
        params: method.parameters.map((p) => ({ name: p.name, type: p.type.name })),
    })),
});

// Read-only drivers. Anything that registers, sends, pushes, swaps, receives,
// claims or touches a third-party login is left alone.
const DENY_CLASS = /^NBSync(LL|FB|GC|PG|Social)/;
const DENY_METHOD =
    /(LL[A-Z]|LL$|FB[A-Z]|GC[A-Z]|PG[A-Z]|set_|send|push|register|swap|receive|recieve|enter|delete|claim|accept|buy|use|NewID|PlayerID|Code|FB|regen|Init|startInstance|add_|remove_|savePlayer|switch|Signal|^update|encode|decode|genHash|^e$|^Q$|Locale|OnApplication|didCheck|should|Social)/i;
const ALLOW_METHOD =
    /^_?(get(?!_)|retrieve|check|pull|current|fetch|load|request|list|snapshot|trade|mail|visit|gift)/i;

interface Candidate {
    readonly label: string;
    readonly klass: Il2Cpp.Class;
    readonly method: Il2Cpp.Method;
    readonly reason: string | null;
}

/** The value to pass for a parameter of a driven method, or undefined if unsupported. */
const argumentFor = (parameter: Il2Cpp.Parameter, ownId: string): Il2Cpp.Parameter.Type | undefined => {
    const type = parameter.type.name;
    if (type.startsWith("System.Action")) {
        const klass = parameter.type.class;
        const invoke = klass.method("Invoke");
        return Il2Cpp.delegate(klass, (...args: Array<Il2Cpp.Parameter.Type>) => {
            const rendered = invoke.parameters.map((p, i) => render(args[i], p.type));
            record({
                id: ++seq,
                kind: "callback",
                tag: "callback",
                key: `${parameter.name}: ${type}`,
                self: null,
                params: rendered,
                ret: null,
            });
        });
    }
    if (type === "System.String" && /(friend|player|^p?id$|ID$)/i.test(parameter.name)) return Il2Cpp.string(ownId);
    if (type === "System.Collections.Generic.List<System.String>") {
        const list = Il2Cpp.corlib
            .class("System.Collections.Generic.List`1")
            .inflate(Il2Cpp.corlib.class("System.String"))
            .new();
        list.method(".ctor", 0).invoke();
        list.method("Add").invoke(Il2Cpp.string(ownId));
        return list;
    }
    if (type === "System.Boolean") return false;
    return undefined;
};

const candidates = (): Array<Candidate> => {
    const out: Array<Candidate> = [];
    for (const klass of gameClasses(
        (k) =>
            k.type.name.startsWith("NBSync") &&
            !DENY_CLASS.test(k.type.name) &&
            !k.isGeneric &&
            !k.isEnum &&
            !/[<>]/.test(k.type.name)
    )) {
        const staticNames = new Set(
            klass.methods.filter((m) => m.isStatic).map((m) => m.name.replace(/^_/, "").toLowerCase())
        );
        for (const method of klass.methods) {
            if (isLambda(method) || DENY_METHOD.test(method.name) || !ALLOW_METHOD.test(method.name)) continue;
            const coroutine = method.returnType.name === "System.Collections.IEnumerator";
            if (!method.isStatic && !coroutine) continue;
            // An instance coroutine with a static wrapper is driven through the wrapper
            if (!method.isStatic && staticNames.has(method.name.replace(/^_/, "").toLowerCase())) continue;
            const label = `${klass.type.name}.${method.name}(${method.parameters.map((p) => `${p.type.name} ${p.name}`).join(", ")})`;
            const supported = method.parameters.every(
                (p) =>
                    p.type.name.startsWith("System.Action") ||
                    p.type.name === "System.Boolean" ||
                    p.type.name === "System.Collections.Generic.List<System.String>" ||
                    (p.type.name === "System.String" && /(friend|player|^p?id$|ID$)/i.test(p.name))
            );
            out.push({ label, klass, method, reason: supported ? null : "unsupported parameter" });
        }
    }
    return out;
};

const startCoroutine = (host: Il2Cpp.Object | null | undefined, enumerator: Il2Cpp.Object): void => {
    if (host === null || host === undefined || host.isNull())
        throw new Error("no MonoBehaviour to run the coroutine on");
    host.method("StartCoroutine", 1).overload("System.Collections.IEnumerator").invoke(enumerator);
};

/** A static of type MonoBehaviour that is set, else undefined (an unset one reads as a NULL object). */
const nonNull = (object: Il2Cpp.Object | null | undefined): Il2Cpp.Object | undefined =>
    object === null || object === undefined || object.isNull() ? undefined : object;

const drive = (ownId: string, label: string): typeof DriveResult.Encoded => {
    try {
        const candidate = candidates().find((c) => c.label === label);
        if (candidate === undefined) return { label, invoked: false, error: "no such method" };
        if (candidate.reason !== null) return { label, invoked: false, error: candidate.reason };
        const { klass, method } = candidate;
        const values = method.parameters
            .map((p) => argumentFor(p, ownId))
            .filter((value): value is Il2Cpp.Parameter.Type => value !== undefined);
        if (values.length !== method.parameterCount) return { label, invoked: false, error: "unsupported parameter" };
        const instance = nonNull(klass.tryField<Il2Cpp.Object>("instance")?.value);
        if (method.isStatic && method.returnType.name !== "System.Collections.IEnumerator") {
            method.invoke(...values);
        } else if (method.isStatic) {
            // A static coroutine only builds its enumerator
            const enumerator = method.invoke(...values);
            if (!(enumerator instanceof Il2Cpp.Object) || enumerator.isNull()) throw new Error("no enumerator");
            startCoroutine(
                instance ?? nonNull(findClass("NBSync")?.tryField<Il2Cpp.Object>("instance")?.value),
                enumerator
            );
        } else {
            const target = instance ?? nonNull(Il2Cpp.gc.choose(klass)[0]);
            if (target === undefined) throw new Error("no instance");
            const enumerator = target.method<Il2Cpp.Object>(method.name, method.parameterCount).invoke(...values);
            if (enumerator.isNull()) throw new Error("no enumerator");
            startCoroutine(target, enumerator);
        }
        return { label, invoked: true, error: null };
    } catch (error) {
        return { label, invoked: false, error: String(error) };
    }
};

const free = <A>(block: () => A): Effect.Effect<A> => Effect.promise(() => Il2Cpp.perform(block, "free"));

const RpcsLive = NBSyncRpcs.toLayer({
    Status: () => Effect.sync(() => ({ tapped, hooked, error: tapError, buffered: buffer.length })),
    TakeEvents: () => Effect.sync(() => JSON.stringify(buffer.splice(0, buffer.length))),
    PlayerId: () =>
        free(() => {
            const id = findClass("NBSync")?.tryMethod<Il2Cpp.String>("get_playerID")?.invoke();
            return id === undefined || id.isNull() ? null : id.content;
        }),
    Statics: ({ className }) =>
        free(() => {
            const klass = findClass(className);
            if (klass === null) return null;
            const out: Record<string, Json> = {};
            for (const field of klass.fields) {
                if (!field.isStatic) continue;
                try {
                    out[field.name] = render(field.value, field.type);
                } catch (error) {
                    out[field.name] = `<error ${String(error)}>`;
                }
            }
            return out;
        }),
    Dump: () => free(() => JSON.stringify(gameClasses((k) => INTERESTING_CLASS.test(k.type.name)).map(describeClass))),
    DrivePlan: () =>
        free(() => candidates().map(({ label, reason }) => ({ label, runnable: reason === null, reason }))),
    // Driven methods start coroutines and touch Unity objects, so they run on
    // the main thread. The JS thread must not wait for them attached (as
    // perform's "main" flag would), so its block only posts the call
    Drive: ({ label, ownId }) =>
        Effect.promise(() =>
            Il2Cpp.perform(() => ({ done: Il2Cpp.mainThread.schedule(() => drive(ownId, label)) }), "free").then(
                ({ done }) => done
            )
        ),
});

const NdJsonSerialization = RpcSerialization.layerNdjson;
const FridaProtocol = Layer.provide(FridaRpcServer.layerProtocolFrida(), NdJsonSerialization);
const Main = RpcServer.layer(NBSyncRpcs).pipe(Layer.provide(RpcsLive), Layer.provide(FridaProtocol));

Layer.launch(Main).pipe(FridaRuntime.runMain);

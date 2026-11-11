import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

/**
 * One hooked call as the NBSync agent saw it: an `enter` with the rendered
 * parameters (and, for web requests, the request's url and handles), then a
 * `leave` with the rendered return value under the same `id`. `callback` is a
 * delegate the agent passed to a driven method being called back, and `drive`
 * marks where the node side started a driven method.
 */
export class TapEvent extends Schema.Class<TapEvent, { readonly brand: unique symbol }>("TapEvent")({
    id: Schema.Int,
    kind: Schema.Literals(["enter", "leave", "callback", "drive", "hook-error"]),
    tag: Schema.String,
    key: Schema.String,
    self: Schema.Unknown,
    params: Schema.Unknown,
    ret: Schema.Unknown,
    t: Schema.Finite,
}) {}

/** A field or method of a class in the game's own assemblies. */
export const ClassInfo = Schema.Struct({
    assembly: Schema.String,
    name: Schema.String,
    parent: Schema.NullOr(Schema.String),
    isEnum: Schema.Boolean,
    fields: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            type: Schema.String,
            static: Schema.Boolean,
            literal: Schema.Boolean,
            value: Schema.Unknown,
        })
    ),
    methods: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            static: Schema.Boolean,
            returns: Schema.String,
            params: Schema.Array(Schema.Struct({ name: Schema.String, type: Schema.String })),
        })
    ),
});

/** A read-only NBSync method the agent can call, or why it will not. */
export const DriveStep = Schema.Struct({
    label: Schema.String,
    runnable: Schema.Boolean,
    reason: Schema.NullOr(Schema.String),
});

/** What happened when the agent called a driven method. */
export const DriveResult = Schema.Struct({
    label: Schema.String,
    invoked: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
});

/** `TakeEvents`' reply. */
export const TapEvents = Schema.fromJsonString(Schema.Array(TapEvent));

/** `Dump`'s reply. */
export const Classes = Schema.fromJsonString(Schema.Array(ClassInfo));

export class NBSyncRpcs extends RpcGroup.make(
    Rpc.make("Status", {
        success: Schema.Struct({
            tapped: Schema.Boolean,
            hooked: Schema.Int,
            error: Schema.NullOr(Schema.String),
            buffered: Schema.Int,
        }),
    }),
    // Large replies cross as one JSON string: the agent's JS engine runs under
    // the ARM translator, where encoding them element by element with Schema
    // takes minutes. The node side decodes them with `TapEvents` and `Classes`.
    Rpc.make("TakeEvents", {
        success: Schema.String,
    }),
    Rpc.make("PlayerId", {
        success: Schema.NullOr(Schema.String),
    }),
    Rpc.make("Statics", {
        payload: { className: Schema.String },
        success: Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Rpc.make("Dump", {
        success: Schema.String,
    }),
    Rpc.make("DrivePlan", {
        payload: { ownId: Schema.String },
        success: Schema.Array(DriveStep),
    }),
    Rpc.make("Drive", {
        payload: { ownId: Schema.String, label: Schema.String },
        success: DriveResult,
    })
) {}

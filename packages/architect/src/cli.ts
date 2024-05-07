#!/usr/bin/env node

import * as Command from "@effect/cli/Command";
import * as Options from "@effect/cli/Options";
import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as MobyApi from "the-moby-effect/Moby";

import packageJson from "../package.json";
import * as architect from "./index.js";

const makePortOption = (name: string) =>
    Options.text(name)
        .pipe(Options.optional)
        .pipe(Options.map(Option.map((p) => [{ HostPort: p }] as const)))
        .pipe(Options.map(Option.getOrUndefined));

const command = Command.make(
    "architect",
    {
        ports: Options.all({
            "5554/tcp": makePortOption("console-port"),
            "5555/tcp": makePortOption("adb-port"),
            "8080/tcp": makePortOption("mitm-web-port"),
            "8081/tcp": makePortOption("envoy-admin-port"),
            "8554/tcp": makePortOption("grpc-port"),
            "8555/tcp": makePortOption("grpc-web-port"),
            "27042/tcp": makePortOption("frida-port"),
        }),
    },
    ({ ports }) =>
        architect.architect({
            // So ugly but it makes the types work out
            portBindings: {
                ...(ports["5554/tcp"] ? { "5554/tcp": ports["5554/tcp"] } : {}),
                ...(ports["5555/tcp"] ? { "5555/tcp": ports["5555/tcp"] } : {}),
                ...(ports["8080/tcp"] ? { "8080/tcp": ports["8080/tcp"] } : {}),
                ...(ports["8081/tcp"] ? { "8081/tcp": ports["8081/tcp"] } : {}),
                ...(ports["8554/tcp"] ? { "8554/tcp": ports["8554/tcp"] } : {}),
                ...(ports["8555/tcp"] ? { "8555/tcp": ports["8555/tcp"] } : {}),
                ...(ports["27042/tcp"] ? { "27042/tcp": ports["27042/tcp"] } : {}),
            },
        })
);

const cli = Command.run(command, {
    name: "architect",
    version: packageJson.version,
});

Effect.suspend(() => cli(process.argv.slice(2))).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(MobyApi.fromDockerHostEnvironmentVariable),
    NodeRuntime.runMain
);

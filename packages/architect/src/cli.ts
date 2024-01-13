#!/usr/bin/env node

import { Effect, Option } from "effect";
import { CliApp, Command, Options } from "@effect/cli";
import * as NodeContext from "@effect/platform-node/NodeContext";

import { architectEffect } from "./index.js";
import { DockerServiceLive } from "./docker.js";

const makePortOption = (name: string) =>
    Options.text(name)
        .pipe(Options.optional)
        .pipe(Options.map(Option.map((p) => [{ HostPort: p }] as const)))
        .pipe(Options.map(Option.getOrUndefined));

const cli = CliApp.make({
    name: "Architect",
    version: "0.0.0",
    command: Command.standard("architect", {
        options: Options.all({
            "5554/tcp": makePortOption("console-port"),
            "5555/tcp": makePortOption("adb-port"),
            "8080/tcp": makePortOption("mitm-web-port"),
            "8081/tcp": makePortOption("envoy-admin-port"),
            "8554/tcp": makePortOption("grpc-port"),
            "8555/tcp": makePortOption("grpc-web-port"),
            "27042/tcp": makePortOption("frida-port"),
        }),
    }),
});

CliApp.run(cli, process.argv.slice(2), ({ options }) =>
    architectEffect({
        // So ugly but it makes the types work out
        portBindings: {
            ...(options["5554/tcp"] ? { "5554/tcp": options["5554/tcp"] } : {}),
            ...(options["5555/tcp"] ? { "5555/tcp": options["5555/tcp"] } : {}),
            ...(options["8080/tcp"] ? { "8080/tcp": options["8080/tcp"] } : {}),
            ...(options["8081/tcp"] ? { "8081/tcp": options["8081/tcp"] } : {}),
            ...(options["8554/tcp"] ? { "8554/tcp": options["8554/tcp"] } : {}),
            ...(options["8555/tcp"] ? { "8555/tcp": options["8555/tcp"] } : {}),
            ...(options["27042/tcp"] ? { "27042/tcp": options["27042/tcp"] } : {}),
        },
    })
)
    .pipe(Effect.scoped)
    .pipe(Effect.provide(NodeContext.layer))
    .pipe(Effect.provide(DockerServiceLive))
    .pipe(Effect.tapErrorCause(Effect.logError))
    .pipe(Effect.runFork);

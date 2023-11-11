#!/usr/bin/env node

import architect from "./index.js";

import { Effect, Option } from "effect";
import { CliApp, Command, Options } from "@effect/cli";
import * as Node from "@effect/platform-node/Runtime";

const makePortOption = (name: string) =>
    Options.integer(name)
        .pipe(Options.optional)
        .pipe(Options.map(Option.map((p) => [{ HostPort: p }] as const)))
        .pipe(Options.map(Option.getOrUndefined));

const cli = CliApp.make({
    name: "Architect",
    version: "0.0.0",
    command: Command.make("architect", {
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

const main = CliApp.run(cli, process.argv.slice(2), ({ options }) => architect({ portBindings: options }));
Node.runMain(main.pipe(Effect.tapErrorCause(Effect.logError)));

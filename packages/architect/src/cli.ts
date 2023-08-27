#!/usr/bin/env node

import yargs from "yargs";
import architect from "./index.js";

await yargs(process.argv.slice(2))
    .scriptName("architect")
    .command(
        "$0",
        "the default command",
        (yargs) =>
            yargs.options({
                "adb-port": { type: "string", demandOption: false, default: "0" },
                "grpc-port": { type: "string", demandOption: false, default: "0" },
                "frida-port": { type: "string", demandOption: false, default: "0" },
                "console-port": { type: "string", demandOption: false, default: "0" },
                "grpc-web-port": { type: "string", demandOption: false, default: "0" },
                "envoy-admin-port": { type: "string", demandOption: false, default: "0" },
            }),
        async (argv) => {
            await architect({
                portBindings: {
                    "5554/tcp": [{ HostPort: argv["console-port"] }],
                    "5555/tcp": [{ HostPort: argv["adb-port"] }],
                    "8081/tcp": [{ HostPort: argv["envoy-admin-port"] }],
                    "8554/tcp": [{ HostPort: argv["grpc-port"] }],
                    "8555/tcp": [{ HostPort: argv["grpc-web-port"] }],
                    "27042/tcp": [{ HostPort: argv["frida-port"] }],
                },
            });
        }
    )
    .help()
    .parseAsync();

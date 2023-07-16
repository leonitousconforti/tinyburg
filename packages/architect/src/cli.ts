#!/usr/bin/env node

import yargs from "yargs";
import architect from "./index.js";

await yargs(process.argv.slice(2))
    .scriptName("architect")
    .command(
        "$0",
        "the default command",
        (yargs) =>
            yargs
                .option("with-additional-services", { type: "boolean", default: false })
                .option("reuse-existing-containers", { type: "boolean", default: false })
                .options({
                    "adb-port": { type: "string", demandOption: false, default: "0" },
                    "grpc-port": { type: "string", demandOption: false, default: "0" },
                    "frida-port": { type: "string", demandOption: false, default: "0" },
                    "console-port": { type: "string", demandOption: false, default: "0" },
                }),
        async (argv) => {
            await architect({
                withAdditionalServices: argv["with-additional-services"],
                reuseExistingContainers: argv["reuse-existing-containers"],
                portBindings: {
                    "5554/tcp": [{ HostPort: argv["console-port"] }],
                    "5555/tcp": [{ HostPort: argv["adb-port"] }],
                    "8554/tcp": [{ HostPort: argv["grpc-port"] }],
                    "27042/tcp": [{ HostPort: argv["frida-port"] }],
                },
            });
        }
    )
    .help()
    .parseAsync();

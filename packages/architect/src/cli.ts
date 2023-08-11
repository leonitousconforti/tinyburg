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
                .option("reuse-existing-containers", { type: "boolean", default: false })
                .option("emulator-container-name", { type: "string", demandOption: false })
                .options({
                    "adb-port": { type: "string", demandOption: false, default: "0" },
                    "grpc-port": { type: "string", demandOption: false, default: "0" },
                    "frida-port": { type: "string", demandOption: false, default: "0" },
                    "console-port": { type: "string", demandOption: false, default: "0" },
                }),
        async (argv) => {
            await architect({
                reuseExistingContainers: argv["reuse-existing-containers"],
                emulatorContainerName: argv["emulator-container-name"],
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

#!/usr/bin/env node

import yargs from "yargs";
import repl from "node:repl";
import { findUpSync } from "find-up";
import { readFileSync } from "node:fs";
import { fromConfig, fromPlayerId } from "@tinyburg/core";

const configPath = findUpSync(["tinyburgrc", "tinyburgrc.json"]);
const config = configPath ? JSON.parse(readFileSync(configPath).toString()) : {};

// Parse arguments from command line
const cliArguments = yargs(process.argv.slice(2))
    .help()
    .config(config)
    .usage("Usage: -i <playerId> -e <playerEmail>")
    .epilogue("Docs can be found at https://github.com/leonitousconforti/tinyburg")
    .options({
        i: {
            alias: "playerId",
            describe: "Your cloud sync player id",
            type: "string",
            demandOption: config?.player?.playerId === undefined,
        },
        e: {
            alias: "playerEmail",
            describe: "Email address for your cloud sync",
            type: "string",
            demandOption: config?.player?.playerId === undefined,
        },
    })
    .parseSync();

// Initialize library object and set the debug level
const tinyTower =
    Object.keys(config).length === 0 ? fromPlayerId(cliArguments.i, cliArguments.e, "") : fromConfig(config);

// Start a repl
repl.start("tinyburg => ").context.tinytower = tinyTower;

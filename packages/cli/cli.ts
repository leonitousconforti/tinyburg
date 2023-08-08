#!/usr/bin/env node

import type { ITTConfig } from "@tinyburg/core/tt-config";

import yargs from "yargs";
import repl from "node:repl";
import { findUpSync } from "find-up";
import { readFileSync } from "node:fs";
import { fromConfig, fromPlayerId } from "@tinyburg/core";

const configPath: string | undefined = findUpSync(["tinyburgrc", "tinyburgrc.json"]);
const config: ITTConfig = configPath ? JSON.parse(readFileSync(configPath).toString()) : {};

// eslint-disable-next-line @rushstack/typedef-var
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

// eslint-disable-next-line @rushstack/typedef-var
const tinyTower =
    Object.keys(config).length === 0 ? fromPlayerId(cliArguments.i || "", cliArguments.e, "") : fromConfig(config);

// eslint-disable-next-line dot-notation
repl.start("tinyburg => ").context["tinytower"] = tinyTower;

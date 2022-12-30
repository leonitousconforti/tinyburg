#!/usr/bin/env node

import yargs from "yargs";
import prompts from "prompts";
import { findUpSync } from "find-up";
import { readFileSync } from "node:fs";
import { fromConfig, fromPlayerId } from "../dist/lib/tinyburg.js";

const configPath = findUpSync(["tinyburgrc", "tinyburgrc.json"]);
const config = configPath ? JSON.parse(readFileSync(configPath).toString()) : {};

// Helper functions for string substring from a starting character and ending character and shortening strings
const substringFromCharacters = (string, char1, char2) =>
    string.slice(string.indexOf(char1), string.indexOf(char2) + 1);
const shortenStringTo = (string, desiredLength) =>
    string.length > desiredLength ? string.slice(0, Math.max(0, desiredLength)) + "..." : string;

// Parse arguments from command line
const cliArguments = yargs(process.argv.slice(2))
    .help()
    .config(config)
    .usage("Usage: -i <playerId> -e <playerEmail> -s <playerSecretSalt> -a <actions> -p <useProxy>")
    .epilogue("For more information, the docs are located at https://github.com/leonitousconforti/tinyburg")
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
        s: { alias: "playerSecretSalt", describe: "Your player secret salt", type: "string", demandOption: false },
        a: {
            alias: "actions",
            describe: "The actions to perform, split by commas (,). Use pipes (|) to chain actions",
            demandOption: false,
            default: "shell",
        },
        p: { alias: "useProxy", demandOption: false, type: "boolean", default: true },
    })
    .parseSync();

// Initialize library object and set the debug level
const tinyTower =
    Object.keys(config).length === 0
        ? fromPlayerId(cliArguments.i, cliArguments.e, cliArguments.s)
        : fromConfig(config);
tinyTower.config.proxy.useProxy = cliArguments.p;

(async function main() {
    // Execute all actions from the command line
    const actions = cliArguments.a.split(/,\s*/g).map((a) => a.trim());
    for (const action of actions) {
        await doAction(action);
    }

    // Drop the user into a "shell"
    shell();
})();

async function shell() {
    // Print a new line for separation
    console.log("");

    // Get all available commands
    const availableCommands = Object.getOwnPropertyNames(tinyTower).filter(
        (property) => typeof tinyTower[property] === "function"
    );

    // User selects the command
    const { command } = await prompts(
        {
            type: "autocomplete",
            name: "command",
            message: "Enter a command or press ^c to exit",
            choices: availableCommands.map((command) => ({
                title: command,
                description: `Executes ${command}`,
                value: command,
            })),
            onState: function () {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.fallback = { title: this.input, description: `Executes ${this.input}`, value: this.input };

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (this.suggestions.length === 0) {
                    this.value = this.fallback.value;
                }
            },
        },
        {
            onCancel: () => Promise.all([console.log("Canceled by user, exiting..."), process.exit(0)]),
        }
    );

    // Execute command and then runs shell again
    await doAction(command);
    shell();
}

async function doAction(functionName, chainedParameters = {}) {
    if (functionName === "shell") return;

    // Performs a chained action
    if (functionName.includes("|")) {
        for (const chainedAction of functionName.split(/\s*\|\s*/g)) {
            chainedParameters[chainedAction + "Result" + Object.keys(chainedParameters).length] = await doAction(
                chainedAction,
                chainedParameters
            );
        }
        return;
    }

    // Check that the request action is an actual function
    if (typeof tinyTower[functionName] !== "function") {
        console.log(`Unknown command: ${functionName}`);
        return;
    }

    // Get additional params required
    let parametersNeeded = substringFromCharacters(tinyTower[functionName].toString(), "(", ")")
        .replace(/[\s()]/g, "")
        .split(",")
        .filter((p) => p !== "");

    // Prompt user for params
    const promptQuestions = parametersNeeded.map((parameter) => ({
        type: "autocomplete",
        name: parameter,
        message: `Enter a value for ${parameter}`,
        choices: Object.keys(chainedParameters).map((parameter_) => ({
            title: parameter_,
            description: `${chainedParameters[parameter_]}`,
            value: chainedParameters[parameter_],
        })),
        onState: function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.fallback = { title: this.input, description: `Executes ${this.input}`, value: this.input };

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (this.suggestions.length === 0) {
                this.value = this.fallback.value;
            }
        },
    }));
    const promptResult = await prompts(promptQuestions, {
        onCancel: () => Promise.all([console.log("Canceled by user, exiting..."), process.exit(0)]),
    });
    const functionParameters = Object.values(promptResult);
    const displayParameters = functionParameters.map((value) => shortenStringTo(value.toString(), 30));

    // Execute the library function
    console.log("Executing function '" + functionName + "' with params: [" + displayParameters + "]");
    let libraryResult;
    try {
        libraryResult = await tinyTower[functionName].call(undefined, ...functionParameters);
        const logMessage =
            libraryResult === undefined ? "Action completed" : "The result was: " + JSON.stringify(libraryResult);
        console.log(shortenStringTo(logMessage, 150));
    } catch (error) {
        libraryResult =
            functionName +
            " failed to execute. Printing a portion of the stack trace below:\n" +
            error.message.split("\n").shift();
        console.log(libraryResult);
    }

    console.log("\n---------------------------------------------");
    return libraryResult;
}

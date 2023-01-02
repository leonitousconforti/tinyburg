#!/usr/bin/env node

import { Command, Option } from "commander";

import { SshEmulator } from "../src/ssh.js";
import { LocalEmulator } from "../src/local.js";
import { DockerEmulator } from "../src/docker.js";
import info from "../package.json" assert { type: "json" };

const description: string =
    "Architect is an app for designing an environment to run TinyTower in. Wether for testing or just for fun, you can use architect to bring up an instance of the game in a local or remote emulator and connect to it.";

const program: Command = new Command();
program.name("tinyburg-architect").description(description).version(info.version);

// Options/arguments shared among all commands
const nameOption: Option = new Option("-n, --name <string>", "name of the emulator").env("EMULATOR_NAME");
const addressOption: Option = new Option("-a, --address <string>", "address of remote machine").env("EMULATOR_MACHINE");

// Options specific to 'up' commands
const adbPortOption: Option = new Option("--adb-port [number]");
const grpcPortOption: Option = new Option("--grpc-port [number]");
const consolePortOption: Option = new Option("--console-port [number]");
const fridaServerPortOption: Option = new Option("--frida-server-port [number]");
const targetFpsOption: Option = new Option("-f, --target-fps [number]", "target fps for the game to run at");
const displayOption: Option = new Option("-d, --display [boolean]", "attempt to render the game in the terminal");

// Three base commands
const sshBase: Command = program.command("ssh");
const localBase: Command = program.command("local");
const dockerBase: Command = program.command("docker");

// Helpers to help make certain commands
const makeCreateCommand = (): Command => new Command("create").addOption(nameOption);
const makeDownCommand = (): Command => new Command("down").addOption(nameOption);
const makeDestroyCommand = (): Command => new Command("destroy").addOption(nameOption);
const makeUpCommand = (): Command =>
    new Command("up")
        .addOption(nameOption)
        .addOption(displayOption)
        .addOption(targetFpsOption)
        .addOption(consolePortOption)
        .addOption(adbPortOption)
        .addOption(grpcPortOption)
        .addOption(fridaServerPortOption);

// All ssh commands
const sshCreate: Command = makeCreateCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new SshEmulator(name, address).create());

const sshUp: Command = makeUpCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => {
        await new SshEmulator(name, address).up();
    });

const sshDown: Command = makeDownCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new SshEmulator(name, address).down());

const sshDestroy: Command = makeDestroyCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new SshEmulator(name, address).destroy());

// All local commands
const localCreate: Command = makeCreateCommand()
    .description("asdf")
    .action(async ({ name }) => {
        await new LocalEmulator(name).create();
    });

const localUp: Command = makeUpCommand()
    .description("asdf")
    .action(async ({ name, ...rest }) => {
        await new LocalEmulator(name, rest).up();
    });

const localDown: Command = makeDownCommand()
    .description("asdf")
    .action(async ({ name }) => await new LocalEmulator(name).down());

const localDestroy: Command = makeDestroyCommand()
    .description("asdf")
    .action(async ({ name }) => await new LocalEmulator(name).destroy());

// All Docker commands
const dockerCreate: Command = makeCreateCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new DockerEmulator(name, address).create());

const dockerUp: Command = makeUpCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => {
        await new DockerEmulator(name, address).up();
    });

const dockerDown: Command = makeDownCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new DockerEmulator(name, address).down());

const dockerDestroy: Command = makeDestroyCommand()
    .description("asdf")
    .addOption(addressOption)
    .action(async ({ name, address }) => await new DockerEmulator(name, address).destroy());

// Parse options and run commands
sshBase.addCommand(sshCreate).addCommand(sshUp).addCommand(sshDown).addCommand(sshDestroy);
localBase.addCommand(localCreate).addCommand(localUp).addCommand(localDown).addCommand(localDestroy);
dockerBase.addCommand(dockerCreate).addCommand(dockerUp).addCommand(dockerDown).addCommand(dockerDestroy);
program.parse();

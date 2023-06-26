import type { IAgent } from "./shared/agent-main-export.js";

import frida from "frida";
import Debug from "debug";
import prettier from "prettier";

import { swcCompiler } from "./compilers/swc.js";
import { fridaCompiler } from "./compilers/frida.js";
import { esbuildCompiler } from "./compilers/esbuild.js";

const logger: Debug.Debugger = Debug.debug("tinyburg:insight");

/** Options for all bootstrapping operations. */
interface IBootstrapOptions {
    /** Which compiler to use */
    compiler: "frida" | "esbuild" | "swc";

    /** Message handler function to receive messages sent over frida gum's ipc */
    messageHandler?: frida.ScriptMessageHandler | undefined;
}

// Find editorconfig and prettier formatting files
const prettierOptions: prettier.Options = {
    parser: "typescript",
    ...(await prettier.resolveConfig(import.meta.url, { editorconfig: true })),
};

/**
 * Cleans up after an agent by unloading the frida script, detaching from the
 * frida session, and closing the game on the device.
 *
 * @param components - The components returned from bootstrapAgent
 */
export const cleanupAgent = async ({
    device,
    session,
    script,
    pid,
}: {
    device: frida.Device;
    session: frida.Session;
    script: frida.Script;
    pid: number;
}): Promise<void> => {
    if (!script.isDestroyed) await script.unload();
    if (!session.isDetached) await session.detach();
    const processes = await device.enumerateProcesses();
    if (processes.some((process) => process.pid === pid)) {
        await device.kill(pid);
    }
};

/**
 * Bootstraps an agent onto a device. First it spawns the game process, then it
 * compiles the agent using the selected compiler and attaches the message
 * handler if one was provided. The default message handler logs errors to the
 * console. Next it loads the script into the game process and resumes the game
 * process. Finally, a runAgent function is returned (along with some other
 * frida components) which can be called with the arguments to your agents
 * main.
 *
 * @param agent - The agent to bootstrap
 * @param device - The device to bootstrap the agent onto
 * @param options - Provide a message handler or select a different compiler
 *   than the default one
 * @returns - The frida components (device, session, script, and process pid) as
 *   well as a runAgent function that takes any arguments required by the agent
 *   and runs it
 */
export const bootstrapAgent = async <T extends IAgent>(
    agent: T,
    device: frida.Device,
    options: IBootstrapOptions | undefined
): Promise<{
    device: frida.Device;
    session: frida.Session;
    script: frida.Script;
    pid: number;
    runAgentMain: (
        ..._arguments: Parameters<T["rpcTypes"]["main"]>
    ) => Promise<Awaited<ReturnType<T["rpcTypes"]["main"]>>>;
}> => {
    // Attach to an android device and spawn the TinyTower app
    logger("Starting bootstrapping of agent '%s'", agent.agentFile);
    const pid: number = await device.spawn("com.nimblebit.tinytower");
    logger("Spawned process: %d on device: %s", pid, device.name);
    const session: frida.Session = await device.attach(pid, { realm: frida.Realm.Emulated });
    logger("Attached to process: %d on device: %s", session.pid, device.name);

    // Compile time and create script
    const compiler = options?.compiler || "swc";
    let source: string;
    switch (compiler) {
        case "esbuild": {
            source = await esbuildCompiler(agent.agentFile);
            break;
        }
        case "frida": {
            source = await fridaCompiler(agent.agentFile);
            break;
        }
        case "swc": {
            source = await swcCompiler(agent.agentFile);
            break;
        }
    }
    const script: frida.Script = await session.createScript(source);

    // Attach message handler to script
    const _messageHandler =
        options?.messageHandler ||
        function onMessage(message: frida.Message) {
            if (message.type === "error") {
                console.error(message.description);
            } else {
                console.log(message.payload);
            }
        };
    script.message.connect(_messageHandler);
    logger("Attached message handler to script");

    // Load script and resume app
    await script.load();
    await device.resume(pid);
    logger("Loaded script and resumed process on device");

    // Closure that accepts arguments to pass to the agents main function and runs it
    /* eslint-disable @typescript-eslint/naming-convention, dot-notation */
    const runAgentMain = async function (
        ...arguments_: Parameters<T["rpcTypes"]["main"]>
    ): Promise<Awaited<ReturnType<T["rpcTypes"]["main"]>>> {
        // Call script and format data
        logger("Now calling agent main...");
        try {
            const main: T["rpcTypes"]["main"] = script.exports["main"]!;

            let data = await main(...arguments_);
            logger("Main returned with no errors");
            if (script.exports["mainProducesSourceCode"] && typeof data === "string") {
                logger("Formatting returned source code");
                data = prettier.format(data, prettierOptions);
            }

            // Cleanup 10-15 seconds after receiving data
            logger("Finished. Will unload script, teardown session, and kill process during the next 15 seconds");
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            await cleanupAgent({ device, session, script, pid });
            return data as Awaited<ReturnType<T["rpcTypes"]["main"]>>;
        } catch (error: unknown) {
            logger("Somethings not right, shutting down and cleaning up");
            await cleanupAgent({ device, session, script, pid });
            throw error instanceof Error ? error : new Error(error as string);
        }
    };
    /* eslint-enable @typescript-eslint/naming-convention, dot-notation */

    return { device, session, script, pid, runAgentMain };
};

/**
 * Bootstraps an agent onto a connected usb device. First it spawns the game
 * process, then it compiles the agent using the selected compiler and attaches
 * the message handler if one was provided. The default message handler logs
 * errors to the console. Next it loads the script into the game process and
 * resumes the game process. Finally, a runAgent function is returned (along
 * with some other frida components) which can be called with the arguments to
 * your agents main.
 *
 * @param agent - The agent to bootstrap
 * @param options - Provide a message handler or select a different compiler
 *   than the default one
 * @returns - The frida components (device, session, script, and process pid) as
 *   well as a runAgent function that takes any arguments required by the agent
 *   and runs it
 */
export const bootstrapAgentOverUsb = async <T extends IAgent>(
    agent: T,
    options?: IBootstrapOptions
): ReturnType<typeof bootstrapAgent<T>> => {
    const device = await frida.getUsbDevice({ timeout: 5000 });
    return bootstrapAgent<T>(agent, device, options);
};

/**
 * Bootstraps an agent onto a remote device with frida server installed. First
 * it spawns the game process, then it compiles the agent using the selected
 * compiler and attaches the message handler if one was provided. The default
 * message handler logs errors to the console. Next it loads the script into the
 * game process and resumes the game process. Finally, a runAgent function is
 * returned (along with some other frida components) which can be called with
 * the arguments to your agents main.
 *
 * @param agent - The agent to bootstrap
 * @param address - The frida server address
 * @param options - Provide a message handler or select a different compiler
 *   than the default one
 * @returns - The frida components (device, session, script, and process pid) as
 *   well as a runAgent function that takes any arguments required by the agent
 *   and runs it
 */
export const bootstrapAgentOnRemote = async <T extends IAgent>(
    agent: T,
    address: string,
    options?: IBootstrapOptions
): ReturnType<typeof bootstrapAgent<T>> => {
    const deviceManager = frida.getDeviceManager();
    const device = await deviceManager.addRemoteDevice(address);
    return bootstrapAgent<T>(agent, device, options);
};

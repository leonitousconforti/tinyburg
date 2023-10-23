import Debug from "debug";
import Dockerode from "dockerode";
import DockerModem from "docker-modem";

import {
    buildImage,
    populateSharedDataVolume,
    buildFreshContainer,
    getExposedEmulatorEndpoints,
    isContainerHealthy,
    installApk,
    type IArchitectEndpoints,
    type IArchitectPortBindings,
} from "./docker-helpers/all.js";

// Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

/**
 * Custom Docker options type for dockerode that allows us to specify the ssh
 * agent correctly.
 */
export type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/**
 * Allocates an emulator container on a local or remote docker host that has kvm
 * acceleration enabled.
 */
export const architect = async (
    options?:
        | {
              timeout?: number | undefined;
              abortController?: AbortController | undefined;
              networkMode?: string | undefined;
              environmentVariables?: string[] | undefined;
              portBindings?: Partial<IArchitectPortBindings> | undefined;
              dockerConnectionOptions?: DockerConnectionOptions | undefined;
          }
        | undefined
): Promise<
    {
        emulatorContainer: Dockerode.Container;
        installApk: (apk: string) => Promise<void>;
    } & IArchitectEndpoints
> => {
    const timeout: number = options?.timeout || 120_000;
    const globalAbortController: AbortController = options?.abortController || new AbortController();

    // Generate a random container name which will be architectXXXXXX
    const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;
    const logger: Debug.Debugger = Debug.debug(`tinyburg:architect:${containerName}`);

    const dockerConnectionOptions: DockerConnectionOptions = Object.assign(
        { socketPath: "/var/run/docker.sock" },
        options?.dockerConnectionOptions || {}
    );
    const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
    const dockerHost: string = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    logger("Connected to docker daemon %s @ %s", dockerConnectionOptions.socketPath, dockerHost);

    const start: number = performance.now();
    await buildImage({ dockerode, logger, abortSignal: globalAbortController.signal });
    await populateSharedDataVolume({ dockerode, logger, abortSignal: globalAbortController.signal });
    const emulatorContainer: Dockerode.Container = await buildFreshContainer({
        dockerode,
        logger,
        containerName,
        networkMode: options?.networkMode,
        portBindings: options?.portBindings,
        environmentVariables: ["DISPLAY=:1"],
        abortSignal: globalAbortController.signal,
    });

    const emulatorEndpoints: IArchitectEndpoints = await getExposedEmulatorEndpoints({ dockerode, emulatorContainer });
    logger("Container endpoints are: %o", emulatorEndpoints);

    let emulatorContainerHealth: boolean = await isContainerHealthy({ logger, container: emulatorContainer });
    while (!emulatorContainerHealth && performance.now() - start < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        emulatorContainerHealth = await isContainerHealthy({ logger, container: emulatorContainer });
    }
    const end: number = performance.now();
    const secondsToHealthy: number = (end - start) / 1000;

    if (!emulatorContainerHealth) {
        throw new Error("Emulator container did not report healthy within the timeout");
    }

    logger(
        "Everything reported healthy after %ss, you can start interacting with the emulator and frida now!",
        secondsToHealthy.toFixed(2)
    );

    if (secondsToHealthy > 60 * 2) {
        // eslint-disable-next-line no-console
        console.warn("That took a really really long time to test architect, are you using nested virtualization?");
    }

    return {
        emulatorContainer,
        ...emulatorEndpoints,
        installApk: (apk: string) => installApk({ apk, logger, container: emulatorContainer }),
    };
};

export default architect;

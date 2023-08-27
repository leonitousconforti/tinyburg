import dotenv from "dotenv";
dotenv.config({ override: false, path: new URL("../.env", import.meta.url) });

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
export const architect = async (options?: {
    portBindings?: Partial<IArchitectPortBindings> | undefined;
    dockerConnectionOptions?: DockerConnectionOptions | undefined;
}): Promise<
    {
        emulatorContainer: Dockerode.Container;
        installApk: (apk: string) => Promise<void>;
    } & IArchitectEndpoints
> => {
    const containerName = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;
    const logger: Debug.Debugger = Debug.debug(`tinyburg:architect:${containerName}`);

    const dockerConnectionOptions = Object.assign(
        { socketPath: "/var/run/docker.sock" },
        options?.dockerConnectionOptions || {}
    );
    const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
    const dockerHost = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    logger("Connected to docker daemon %s @ %s", dockerConnectionOptions.socketPath, dockerHost);

    const start = performance.now();
    await buildImage({ dockerode, logger });
    await populateSharedDataVolume({ dockerode, logger });
    const emulatorContainer = await buildFreshContainer({
        dockerode,
        logger,
        containerName,
        portBindings: options?.portBindings,
    });

    const emulatorEndpoints = await getExposedEmulatorEndpoints({ dockerode, logger, emulatorContainer });
    let emulatorContainerHealth = await isContainerHealthy({ logger, container: emulatorContainer });
    while (!emulatorContainerHealth) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        emulatorContainerHealth = await isContainerHealthy({ logger, container: emulatorContainer });
    }
    const end = performance.now();

    logger(
        "Everything reported healthy after %ss, you can start interacting with the emulator+frida now!",
        ((end - start) / 1000).toFixed(2)
    );
    return {
        emulatorContainer,
        ...emulatorEndpoints,
        installApk: (apk: string) => installApk({ apk, logger, container: emulatorContainer }),
    };
};

export default architect;

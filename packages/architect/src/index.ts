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

// Possibly Override the docker host environment variable
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
 * and gpu acceleration enabled. You can configure the network mode, environment
 * variables, and port bindings of the container.
 */
export const architect = async (
    options?:
        | {
              // Configurable parts of the container
              networkMode?: string | undefined;
              environmentVariables?: string[] | undefined;
              portBindings?: Partial<IArchitectPortBindings> | undefined;

              // Docker things
              abortSignal?: AbortSignal | undefined;
              dockerConnectionOptions?: DockerConnectionOptions | undefined;
          }
        | undefined
): Promise<{
    emulatorContainer: Dockerode.Container;
    installApk: (apk: string) => Promise<void>;
    containerEndpoints: Awaited<ReturnType<typeof getExposedEmulatorEndpoints>>;
}> => {
    // Generate a random container name which will be architectXXXXXX
    const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;
    const logger: Debug.Debugger = Debug.debug(`tinyburg:architect:${containerName}`);

    // Connect to docker host!
    const dockerConnectionOptions: DockerConnectionOptions = Object.assign(
        { socketPath: "/var/run/docker.sock" },
        options?.dockerConnectionOptions || {}
    );
    const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
    const dockerHost: string = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    logger("Connected to docker daemon %s @ %s", dockerConnectionOptions.socketPath, dockerHost);

    // Build the image, then populate the shared data volume, then
    // build a fresh container and get the available container endpoints.
    const start: number = performance.now();
    await buildImage({ dockerode, logger, abortSignal: options?.abortSignal });
    await populateSharedDataVolume({ dockerode, logger, abortSignal: options?.abortSignal });

    const emulatorContainer: Dockerode.Container = await buildFreshContainer({
        dockerode,
        logger,
        containerName,
        networkMode: options?.networkMode,
        portBindings: options?.portBindings,
        environmentVariables: options?.environmentVariables,
        abortSignal: options?.abortSignal,
    });

    const containerEndpoints:
        | [usingHostNetworking: IArchitectEndpoints]
        | [usingHostNetworking: IArchitectEndpoints, usingContainersIPv4Networking: IArchitectEndpoints] =
        await getExposedEmulatorEndpoints({
            dockerode,
            emulatorContainer,
        });

    logger("Container endpoints are: %o", containerEndpoints);

    // Wait for the container to become healthy
    // (will timeout after 2mins when docker reports it's status as unhealthy)
    let emulatorContainerHealth: boolean = await isContainerHealthy({ logger, container: emulatorContainer });
    while (!emulatorContainerHealth) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        emulatorContainerHealth = await isContainerHealthy({ logger, container: emulatorContainer });
    }

    // Everything is finally healthy!
    const end: number = performance.now();
    logger(
        "Everything reported healthy after %ss, you can start interacting with the endpoints now!",
        ((end - start) / 1000).toFixed(2)
    );

    return {
        emulatorContainer,
        containerEndpoints,
        installApk: (apk: string) => installApk({ apk, logger, container: emulatorContainer }),
    };
};

export default architect;

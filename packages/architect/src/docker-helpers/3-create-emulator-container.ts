import Debug from "debug";
import Dockerode from "dockerode";

import { containerCreateOptions, type IArchitectPortBindings } from "./0-shared-options.js";

/**
 * Creates a new architect docker container using the shared docker volume
 * populated earlier. This container will not save any state in the shared
 * volume, but it will load a snapshot from it which drastically decreases boot
 * times.
 */
export const buildFreshContainer = async ({
    dockerode,
    logger,
    containerName,
    abortSignal,
    networkMode,
    portBindings,
    environmentVariables,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    containerName: string;
    networkMode?: string | undefined;
    abortSignal?: AbortSignal | undefined;
    environmentVariables?: string[] | undefined;
    portBindings?: Partial<IArchitectPortBindings> | undefined;
}): Promise<Dockerode.Container> => {
    // Merge port bindings, 0 means pick a random unused port
    const PortBindings: IArchitectPortBindings = Object.assign(
        {},
        {
            "5554/tcp": [{ HostPort: "0" }],
            "5555/tcp": [{ HostPort: "0" }],
            "8080/tcp": [{ HostPort: "0" }],
            "8081/tcp": [{ HostPort: "0" }],
            "8554/tcp": [{ HostPort: "0" }],
            "8555/tcp": [{ HostPort: "0" }],
            "27042/tcp": [{ HostPort: "0" }],
        },
        portBindings || {}
    ) satisfies IArchitectPortBindings;

    logger("Creating emulator container from image with kvm acceleration enabled");
    const containerOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
        abortSignal,
        containerName,
        networkMode,
        environmentVariables,
        portBindings: PortBindings,
    });
    const container: Dockerode.Container = await dockerode.createContainer(containerOptions);

    logger("Starting container %s", container.id);
    await container.start();
    return container;
};

export default buildFreshContainer;

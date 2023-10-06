import Debug from "debug";
import Dockerode from "dockerode";

import { containerCreateOptions, type IArchitectPortBindings } from "./0-shared-options.js";

export const buildFreshContainer = async ({
    dockerode,
    logger,
    containerName,
    portBindings,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    containerName: string;
    portBindings?: Partial<IArchitectPortBindings> | undefined;
}): Promise<Dockerode.Container> => {
    // Merge port bindings, 0 means pick a random unused port
    const PortBindings = Object.assign(
        {},
        {
            "5554/tcp": [{ HostPort: "0" }],
            "5555/tcp": [{ HostPort: "0" }],
            "8081/tcp": [{ HostPort: "0" }],
            "8554/tcp": [{ HostPort: "0" }],
            "8555/tcp": [{ HostPort: "0" }],
            "27042/tcp": [{ HostPort: "0" }],
        },
        portBindings || {}
    ) satisfies IArchitectPortBindings;

    // Now we can start the container
    logger("Creating emulator container from image with kvm acceleration enabled");
    const containerOptions = containerCreateOptions({ containerName, portBindings: PortBindings });
    const container: Dockerode.Container = await dockerode.createContainer(containerOptions);

    logger("Starting container %s", container.id);
    await container.start();
    return container;
};

export default buildFreshContainer;

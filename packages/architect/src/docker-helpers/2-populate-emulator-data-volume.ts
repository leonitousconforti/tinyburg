import Debug from "debug";
import Dockerode from "dockerode";

import { containerCreateOptions } from "./0-shared-options.js";
import { SHARED_EMULATOR_DATA_VOLUME_NAME, SHARED_VOLUME_CONTAINER_HELPER_NAME } from "../versions.js";

/**
 * If the architect emulator shared volume does not exists on the docker host,
 * then this will create a new docker volume and run the architect docker image
 * to populate the shared volume then return it. If it finds a container already
 * populating the shared volume then it will wait until that container exists.
 * If the shared volume already exists and there is no container populating it,
 * then it returns immediately because there is no work to do.
 */
export const populateSharedDataVolume = async ({
    dockerode,
    logger,
    abortSignal,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    abortSignal?: AbortSignal | undefined;
}): Promise<void> => {
    logger("Populating shared emulator data volume...");

    // Helper to search for any containers with the name of the helper container
    const searchForExistingContainer = async (): Promise<Dockerode.ContainerInfo[]> =>
        dockerode.listContainers({
            filters: JSON.stringify({ name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] }),
        });

    // Check for the container building the existing emulator data volume
    let containers: Dockerode.ContainerInfo[] = await searchForExistingContainer();
    while (containers.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        containers = await searchForExistingContainer();
    }

    // Check for the existing emulator data volume
    const volumeExists: Dockerode.VolumeInspectInfo | undefined = await dockerode
        .listVolumes({ filters: JSON.stringify({ name: [SHARED_EMULATOR_DATA_VOLUME_NAME] }), abortSignal })
        .then((data) => data.Volumes[0]);

    // If the volume exists then we do not have to repopulate it
    if (volumeExists) {
        logger("Volume already existed, so no work needed to be done");
        return;
    }

    // Create the helper container and run the make-snapshot.sh script
    await dockerode.createVolume({ Driver: "local", Name: SHARED_EMULATOR_DATA_VOLUME_NAME });
    const createOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
        containerName: SHARED_VOLUME_CONTAINER_HELPER_NAME,
        command: ["/android/sdk/make-snapshot.sh"],
    });
    const volumeHelperContainer: Dockerode.Container = await dockerode.createContainer(createOptions);
    await volumeHelperContainer.start();

    // Wait for the container to exit and handle errors
    const exitCode: { StatusCode: number } = await volumeHelperContainer.wait(abortSignal ? { abortSignal } : {});
    if (exitCode.StatusCode !== 0) {
        await volumeHelperContainer.remove();
        await dockerode.getVolume(SHARED_EMULATOR_DATA_VOLUME_NAME).remove();
        throw new Error("An error ocurred when populating the shared emulator data volume");
    }

    logger("Shared emulator data volume population complete!");
    await volumeHelperContainer.remove();
};

export default populateSharedDataVolume;

import Debug from "debug";
import Dockerode from "dockerode";

import { couldNotPopulateShareVolume } from "../errors.js";
import { containerCreateOptions } from "./0-shared-options.js";
import { SHARED_EMULATOR_DATA_VOLUME_NAME, SHARED_VOLUME_CONTAINER_HELPER_NAME } from "./constants.js";

export const populateSharedDataVolume = async ({
    dockerode,
    logger,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
}): Promise<void> => {
    logger("Populating shared emulator data volume...");

    // Check for the container building the existing emulator data volume
    let containers = await dockerode.listContainers({
        filters: JSON.stringify({ name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] }),
    });
    while (containers.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        containers = await dockerode.listContainers({
            filters: JSON.stringify({ name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] }),
        });
    }

    // Check for the existing emulator data volume
    const volumeExists = await dockerode
        .listVolumes({ filters: JSON.stringify({ name: [SHARED_EMULATOR_DATA_VOLUME_NAME] }) })
        .then((data) => data.Volumes[0]);

    // If the volume exists then we do not have to repopulate it
    if (volumeExists) {
        logger("Volume already existed, so no work needed to be done");
        return;
    }

    // TODO: all user to specify volume options
    await dockerode.createVolume({ Driver: "local", Name: SHARED_EMULATOR_DATA_VOLUME_NAME });

    // Create the helper container and run the make-snapshot.sh script
    const createOptions = containerCreateOptions({
        containerName: SHARED_VOLUME_CONTAINER_HELPER_NAME,
        command: ["/android/sdk/make-snapshot.sh"],
    });
    const volumeHelperContainer: Dockerode.Container = await dockerode.createContainer(createOptions);
    await volumeHelperContainer.start();

    // Wait for the container to exit and handle errors
    const exitCode: { StatusCode: number } = await volumeHelperContainer.wait();
    if (exitCode.StatusCode !== 0) {
        await volumeHelperContainer.remove();
        throw new Error(couldNotPopulateShareVolume(SHARED_VOLUME_CONTAINER_HELPER_NAME));
    }

    logger("Shared emulator data volume population complete!");
    await volumeHelperContainer.remove();
};

export default populateSharedDataVolume;

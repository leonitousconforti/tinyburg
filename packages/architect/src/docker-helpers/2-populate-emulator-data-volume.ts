import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as MobyApi from "the-moby-effect";

import { SHARED_EMULATOR_DATA_VOLUME_NAME, SHARED_VOLUME_CONTAINER_HELPER_NAME } from "../versions.js";
import { containerCreateOptions } from "./0-shared-options.js";

/**
 * If the architect emulator shared volume does not exists on the docker host,
 * then this will create a new docker volume and run the architect docker image
 * to populate the shared volume then return it. If it finds a container already
 * populating the shared volume then it will wait until that container exists.
 * If the shared volume already exists and there is no container populating it,
 * then it returns immediately because there is no work to do.
 *
 * @internal
 */
export const populateSharedDataVolume = (): Effect.Effect<
    Readonly<MobyApi.Schemas.Volume>,
    MobyApi.Volumes.VolumesError | MobyApi.Containers.ContainersError | Error,
    MobyApi.Volumes.Volumes | MobyApi.Containers.Containers
> =>
    Effect.gen(function* () {
        const volumes: MobyApi.Volumes.Volumes = yield* MobyApi.Volumes.Volumes;
        const containers: MobyApi.Containers.Containers = yield* MobyApi.Containers.Containers;
        yield* Effect.logInfo("Populating shared emulator data volume...");

        // Wait for any existing containers to be gone
        yield* Effect.retry(
            Effect.gen(function* () {
                const anyContainers: MobyApi.Schemas.VolumeListResponse = yield* volumes.list({
                    filters: { name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] },
                });

                if (anyContainers.Volumes && anyContainers.Volumes?.length > 0) {
                    yield* Effect.fail(new Error("Helper containers still existed after timeout"));
                }
            }),
            Schedule.addDelay(Schedule.recurs(60), () => 5000)
        );

        // Check for the existing emulator data volume
        const maybeVolume: MobyApi.Schemas.VolumeListResponse = yield* volumes.list({
            filters: { name: [SHARED_EMULATOR_DATA_VOLUME_NAME] },
        });

        // If the volume exists then we do not have to repopulate it
        if (maybeVolume.Volumes && maybeVolume.Volumes[0]) {
            const volume: MobyApi.Schemas.Volume = maybeVolume.Volumes[0];
            yield* Effect.log(`Volume ${volume.Name} already existed, so no work needed to be done`);
            return volume;
        }

        // Create the helper container and run the make-snapshot.sh script
        const volume: Readonly<MobyApi.Schemas.Volume> = yield* volumes.create({
            Driver: "local",
            Name: SHARED_EMULATOR_DATA_VOLUME_NAME,
        });
        const createOptions: MobyApi.Containers.ContainerCreateOptions = containerCreateOptions({
            portBindings: {},
            networkMode: undefined,
            environmentVariables: [],
            containerName: SHARED_VOLUME_CONTAINER_HELPER_NAME,
            command: Option.some(["/android/sdk/make-snapshot.sh"]),
        });
        const volumeHelperContainer: MobyApi.Schemas.ContainerCreateResponse = yield* containers.create(createOptions);
        yield* containers.start({ id: volumeHelperContainer.Id });

        // Wait for the container to exit and handle errors
        const exitCode: MobyApi.Schemas.ContainerWaitResponse = yield* containers.wait({
            id: volumeHelperContainer.Id,
        });

        if (exitCode.StatusCode !== 0) {
            yield* containers.delete({ id: volumeHelperContainer.Id });
            yield* volumes.delete({ name: volume.Name, force: true });
            return yield* Effect.fail(new Error("An error ocurred when populating the shared emulator data volume"));
        }

        yield* Effect.logInfo("Shared emulator data volume population complete");
        yield* containers.delete({ id: volumeHelperContainer.Id });
        return volume;
    });

export default populateSharedDataVolume;

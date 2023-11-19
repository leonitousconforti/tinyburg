import Dockerode from "dockerode";
import { Effect, Option, Schedule, Scope } from "effect";

import { containerCreateOptions } from "./0-shared-options.js";
import { DockerError, DockerService } from "../docker.js";
import { SHARED_EMULATOR_DATA_VOLUME_NAME, SHARED_VOLUME_CONTAINER_HELPER_NAME } from "../versions.js";

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
export const populateSharedDataVolume = (): Effect.Effect<Scope.Scope | DockerService, DockerError, void> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const dockerService: DockerService = yield* _(DockerService);
        yield* _(Effect.logInfo("Populating shared emulator data volume..."));

        // Wait for any existing containers to be gone
        yield* _(
            Effect.retry(
                Effect.gen(function* (_: Effect.Adapter) {
                    const anyContainers: Dockerode.ContainerInfo[] = yield* _(
                        dockerService.listContainers({
                            filters: JSON.stringify({ name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] }),
                        })
                    );
                    return anyContainers.length > 0 ? Effect.fail(new Error("Containers still exist")) : Effect.unit;
                }),
                Schedule.addDelay(Schedule.recurs(60), () => 5000)
            )
        );

        // Check for the existing emulator data volume
        const maybeVolume: Dockerode.VolumeInspectInfo[] | undefined = yield* _(
            dockerService
                .listVolumes({
                    filters: JSON.stringify({ name: [SHARED_EMULATOR_DATA_VOLUME_NAME] }),
                })
                .pipe(Effect.map(({ Volumes }) => Volumes))
        );

        // If the volume exists then we do not have to repopulate it
        if (maybeVolume?.length > 0) {
            yield* _(Effect.log("Volume already existed, so no work needed to be done"));
            return;
        }

        // Create the helper container and run the make-snapshot.sh script
        yield* _(dockerService.createVolume({ Driver: "local", Name: SHARED_EMULATOR_DATA_VOLUME_NAME }));
        const createOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
            portBindings: {},
            environmentVariables: [],
            networkMode: Option.none(),
            containerName: SHARED_VOLUME_CONTAINER_HELPER_NAME,
            command: Option.some(["/android/sdk/make-snapshot.sh"]),
        });
        const volumeHelperContainer: Dockerode.Container = yield* _(dockerService.createContainer(createOptions));
        yield* _(Effect.promise(() => volumeHelperContainer.start()));

        // Wait for the container to exit and handle errors
        const exitCode: { StatusCode: number } = yield* _(Effect.promise(() => volumeHelperContainer.wait()));
        if (exitCode.StatusCode !== 0) {
            yield* _(Effect.promise(() => volumeHelperContainer.stop()));
            yield* _(Effect.promise(() => volumeHelperContainer.remove()));
            const volume: Dockerode.Volume = yield* _(dockerService.getVolume(SHARED_EMULATOR_DATA_VOLUME_NAME));
            yield* _(Effect.promise(() => volume.remove()));
            yield* _(new DockerError({ message: "An error ocurred when populating the shared emulator data volume" }));
        }

        yield* _(Effect.logInfo("Shared emulator data volume population complete"));
        yield* _(Effect.promise(() => volumeHelperContainer.remove()));
    }).pipe(Effect.catchAll((error: unknown) => new DockerError({ message: `${error}` })));

export default populateSharedDataVolume;

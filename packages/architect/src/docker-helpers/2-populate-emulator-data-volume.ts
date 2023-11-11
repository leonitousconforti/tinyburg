import Dockerode from "dockerode";
import { Effect, Option } from "effect";

import { DockerError } from "./all.js";
import { containerCreateOptions } from "./0-shared-options.js";
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
export const populateSharedDataVolume = ({
    dockerode,
}: {
    readonly dockerode: Readonly<Dockerode>;
}): Effect.Effect<never, DockerError, void> =>
    Effect.gen(function* (_: Effect.Adapter) {
        Effect.promise(() =>
            dockerode.listContainers({
                filters: JSON.stringify({ name: [SHARED_VOLUME_CONTAINER_HELPER_NAME] }),
            })
        )
            .pipe(
                Effect.flatMap((containers) => (containers.length > 0 ? Effect.succeed(containers) : Effect.fail("A")))
            )
            .pipe(Effect.retryN(30));

        // Check for the existing emulator data volume
        const volumeExists: Dockerode.VolumeInspectInfo | undefined = yield* _(
            Effect.promise(() =>
                dockerode
                    .listVolumes({ filters: JSON.stringify({ name: [SHARED_EMULATOR_DATA_VOLUME_NAME] }) })
                    .then((data) => data.Volumes[0])
            )
        );

        // If the volume exists then we do not have to repopulate it
        if (volumeExists) {
            return;
        }

        // Create the helper container and run the make-snapshot.sh script
        yield* _(
            Effect.promise(() => dockerode.createVolume({ Driver: "local", Name: SHARED_EMULATOR_DATA_VOLUME_NAME }))
        );
        const createOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
            environmentVariables: [],
            networkMode: Option.none(),
            portBindings: {},
            containerName: SHARED_VOLUME_CONTAINER_HELPER_NAME,
            command: Option.some(["/android/sdk/make-snapshot.sh"]),
        });
        const volumeHelperContainer: Dockerode.Container = yield* _(
            Effect.promise(() => dockerode.createContainer(createOptions))
        );
        yield* _(Effect.promise(() => volumeHelperContainer.start()));

        // Wait for the container to exit and handle errors
        const exitCode: { StatusCode: number } = yield* _(Effect.promise(() => volumeHelperContainer.wait()));
        if (exitCode.StatusCode !== 0) {
            yield* _(Effect.promise(() => volumeHelperContainer.stop()));
            yield* _(Effect.promise(() => volumeHelperContainer.remove()));
            yield* _(Effect.promise(() => dockerode.getVolume(SHARED_EMULATOR_DATA_VOLUME_NAME).remove()));
            throw new Error("An error ocurred when populating the shared emulator data volume");
        }

        yield* _(Effect.promise(() => volumeHelperContainer.remove()));
    }).pipe(Effect.catchAll((error: unknown) => new DockerError({ message: `${error}` })));

export default populateSharedDataVolume;

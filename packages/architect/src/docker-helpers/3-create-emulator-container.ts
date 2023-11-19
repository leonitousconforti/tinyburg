import Dockerode from "dockerode";
import { Effect, Option, Scope, pipe } from "effect";

import { DockerService, DockerError } from "../docker.js";
import { containerCreateOptions, type IArchitectPortBindings } from "./0-shared-options.js";

/**
 * Creates a new architect docker container using the shared docker volume
 * populated earlier. This container will not save any state in the shared
 * volume, but it will load a snapshot from it which drastically decreases boot
 * times.
 */
export const buildFreshContainer = ({
    containerName,
    networkMode,
    portBindings,
    environmentVariables,
}: {
    containerName: string;
    environmentVariables: string[];
    networkMode: Option.Option<string>;
    portBindings: Partial<IArchitectPortBindings>;
}): Effect.Effect<DockerService | Scope.Scope, DockerError, Dockerode.Container> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const dockerService: DockerService = yield* _(DockerService);

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
            } satisfies IArchitectPortBindings,
            portBindings
        );

        yield* _(Effect.log("Creating emulator container from image with kvm acceleration enabled"));
        const containerOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
            networkMode,
            containerName,
            environmentVariables,
            command: Option.none(),
            portBindings: PortBindings,
        });
        const container: Dockerode.Container = yield* _(dockerService.createContainer(containerOptions));

        yield* _(Effect.log(`Starting container ${container.id}`));
        yield* _(
            Effect.tryPromise({
                try: () => container.start(),
                catch: (error) => new DockerError({ message: `StartingContainer ${error}` }),
            })
        );

        // Wait for Container to become healthy
        yield* _(
            Effect.retryWhileEffect(
                pipe(
                    dockerService.inspectContainer(container),
                    Effect.tap(({ State }) =>
                        Effect.log(`Waiting for container to report healthy: status=${State.Health?.Status}`)
                    ),
                    Effect.map(({ State }) => State.Health?.Status === "healthy"),
                    Effect.flatMap((isHealthy) =>
                        isHealthy ? Effect.unit : new DockerError({ message: "Container is not healthy" })
                    )
                ),
                () =>
                    dockerService
                        .inspectContainer(container)
                        .pipe(Effect.map(({ State }) => State.Running && State.Health?.Status !== "unhealthy"))
            )
        );

        return container;
    });

export default buildFreshContainer;

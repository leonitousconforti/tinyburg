import Dockerode from "dockerode";
import { Effect, Option, Scope } from "effect";

import { dockerClient, DockerService, DockerError } from "../docker.js";
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
        const dockerode: Dockerode = yield* _(dockerClient());
        const dockerService: DockerService = yield* _(DockerService);

        // Merge port bindings, 0 means pick a random unused port
        const PortBindings: IArchitectPortBindings = Object.assign(
            {},
            {
                "5554/tcp": [{ HostPort: 0 }],
                "5555/tcp": [{ HostPort: 0 }],
                "8080/tcp": [{ HostPort: 0 }],
                "8081/tcp": [{ HostPort: 0 }],
                "8554/tcp": [{ HostPort: 0 }],
                "8555/tcp": [{ HostPort: 0 }],
                "27042/tcp": [{ HostPort: 0 }],
            } satisfies IArchitectPortBindings,
            portBindings
        );

        console.log(PortBindings);

        const containerOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
            networkMode,
            containerName,
            environmentVariables,
            command: Option.none(),
            portBindings: PortBindings,
        });
        const container: Dockerode.Container = yield* _(dockerService.createContainer(dockerode, containerOptions));

        yield* _(
            Effect.tryPromise({
                try: () => container.start(),
                catch: (error) => new DockerError({ message: `${error}` }),
            })
        );
        return container;
    });

export default buildFreshContainer;

import Dockerode from "dockerode";
import { Effect, Option } from "effect";

import { DockerError } from "./all.js";
import { containerCreateOptions, type IArchitectPortBindings } from "./0-shared-options.js";

/**
 * Creates a new architect docker container using the shared docker volume
 * populated earlier. This container will not save any state in the shared
 * volume, but it will load a snapshot from it which drastically decreases boot
 * times.
 */
export const buildFreshContainer = ({
    dockerode,
    containerName,
    networkMode,
    portBindings,
    environmentVariables,
}: {
    dockerode: Dockerode;
    containerName: string;
    environmentVariables: string[];
    networkMode: Option.Option<string>;
    portBindings: IArchitectPortBindings;
}): Effect.Effect<never, DockerError, Dockerode.Container> =>
    Effect.gen(function* (_: Effect.Adapter) {
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

        const containerOptions: Dockerode.ContainerCreateOptions = containerCreateOptions({
            networkMode,
            containerName,
            environmentVariables,
            command: Option.none(),
            portBindings: PortBindings,
        });

        const container: Dockerode.Container = yield* _(
            Effect.promise(() => dockerode.createContainer(containerOptions))
        );

        yield* _(Effect.promise(() => container.start()));
        return container;
    });

export default buildFreshContainer;

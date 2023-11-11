import Dockerode from "dockerode";
import DockerModem from "docker-modem";
import { Effect, Option } from "effect";

import {
    buildImage,
    populateSharedDataVolume,
    buildFreshContainer,
    getExposedEmulatorEndpoints,
    isContainerHealthy,
    installApk,
    DockerError,
    type IArchitectEndpoints,
    type IArchitectPortBindings,
} from "./docker-helpers/all.js";

// Possibly Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

/**
 * Custom Docker options type for dockerode that allows us to specify the ssh
 * agent correctly.
 */
export type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/**
 * Allocates an emulator container on a local or remote docker host that has kvm
 * and gpu acceleration enabled. You can configure the network mode, environment
 * variables, and port bindings of the container.
 */
export const architect = (
    options?:
        | {
              // Configurable parts of the container
              networkMode?: string | undefined;
              environmentVariables?: string[] | undefined;
              portBindings?: { [P in keyof IArchitectPortBindings]: IArchitectPortBindings[P] | undefined } | undefined;

              // Docker things
              dockerConnectionOptions?: DockerConnectionOptions | undefined;
          }
        | undefined
): Effect.Effect<
    never,
    DockerError,
    {
        emulatorContainer: Dockerode.Container;
        installApk: (apk: string) => Promise<void>;
        containerEndpoints: Awaited<ReturnType<typeof getExposedEmulatorEndpoints>>;
    }
> =>
    Effect.gen(function* (_: Effect.Adapter) {
        // Generate a random container name which will be architectXXXXXX
        const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;

        // Connect to docker host!
        const dockerConnectionOptions: DockerConnectionOptions = Object.assign(
            { socketPath: "/var/run/docker.sock" },
            options?.dockerConnectionOptions || {}
        );
        const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
        const dockerHost: string = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";

        // Build the image, then populate the shared data volume, then
        // build a fresh container and get the available container endpoints.
        yield* _(buildImage({ dockerode, onProgress: Option.none() }));
        yield* _(populateSharedDataVolume({ dockerode }));

        const emulatorContainer: Dockerode.Container = yield* _(
            buildFreshContainer({
                dockerode,
                containerName,
                portBindings: options?.portBindings || {},
                networkMode: Option.fromNullable(options?.networkMode),
                environmentVariables: options?.environmentVariables || [],
            })
        );

        const containerEndpoints:
            | [usingHostNetworking: IArchitectEndpoints]
            | [usingHostNetworking: IArchitectEndpoints, usingContainersIPv4Networking: IArchitectEndpoints] =
            getExposedEmulatorEndpoints({
                dockerode,
                emulatorContainer,
            });

        // Wait for the container to become healthy
        // (will timeout after 2mins when docker reports it's status as unhealthy)
        // let emulatorContainerHealth: boolean = isContainerHealthy({ container: emulatorContainer });
        // while (!emulatorContainerHealth) {
        //     new Promise((resolve) => setTimeout(resolve, 1000));
        //     emulatorContainerHealth = isContainerHealthy({ container: emulatorContainer });
        // }

        return {
            emulatorContainer,
            containerEndpoints,
            installApk: (apk: string) => installApk({ apk, container: emulatorContainer }),
        };
    });

export default architect;

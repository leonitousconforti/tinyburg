import Dockerode from "dockerode";
import { Effect, Option, Scope } from "effect";

import {
    buildImage,
    populateSharedDataVolume,
    buildFreshContainer,
    getExposedEmulatorEndpoints,
    installApk,
    type IArchitectEndpoints,
    type IArchitectPortBindings,
} from "./docker-helpers/all.js";
import { DockerConnectionOptions, DockerService, DockerError, dockerClient, DockerServiceLive } from "./docker.js";
import { waitForContainerToBeHealthy } from "./docker-helpers/5-container-helpers.js";

// Possibly Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

/** @internal */
export const architectEffect = (
    options?:
        | {
              // Configurable parts of the container
              networkMode?: string | undefined;
              environmentVariables?: string[] | undefined;
              portBindings?: Partial<IArchitectPortBindings> | undefined;

              // Docker host things
              dockerConnectionOptions?: DockerConnectionOptions | undefined;
          }
        | undefined
): Effect.Effect<
    Scope.Scope | DockerService,
    DockerError,
    {
        emulatorContainer: Dockerode.Container;
        installApk: (apk: string) => Promise<void>;
        containerEndpoints: Effect.Effect.Success<ReturnType<typeof getExposedEmulatorEndpoints>>;
    }
> =>
    Effect.gen(function* (_: Effect.Adapter) {
        // Generate a random container name which will be architectXXXXXX
        const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;
        yield* _(dockerClient(options?.dockerConnectionOptions));
        yield* _(buildImage({ onProgress: Option.some(console.log) }));
        yield* _(populateSharedDataVolume());

        const emulatorContainer: Dockerode.Container = yield* _(
            buildFreshContainer({
                containerName,
                portBindings: options?.portBindings || {},
                networkMode: Option.fromNullable(options?.networkMode),
                environmentVariables: options?.environmentVariables || [],
            })
        );

        const containerEndpoints:
            | [usingHostNetworking: IArchitectEndpoints]
            | [usingHostNetworking: IArchitectEndpoints, usingContainersIPv4Networking: IArchitectEndpoints] = yield* _(
            getExposedEmulatorEndpoints({
                emulatorContainer,
            })
        );

        yield* _(waitForContainerToBeHealthy(emulatorContainer));

        return {
            emulatorContainer,
            containerEndpoints: containerEndpoints,
            installApk: (apk: string) => Effect.runPromise(installApk({ apk, container: emulatorContainer })),
        };
    });

export const architect = (
    options?:
        | {
              // Configurable parts of the container
              networkMode?: string | undefined;
              environmentVariables?: string[] | undefined;
              portBindings?: Partial<IArchitectPortBindings> | undefined;

              // Docker host things
              dockerConnectionOptions?: DockerConnectionOptions | undefined;
          }
        | undefined
): Promise<{
    emulatorContainer: Dockerode.Container;
    installApk: (apk: string) => Promise<void>;
    containerEndpoints: Effect.Effect.Success<ReturnType<typeof getExposedEmulatorEndpoints>>;
}> =>
    architectEffect(options)
        .pipe(Effect.scoped)
        .pipe(Effect.provide(DockerServiceLive))
        .pipe(Effect.orDie)
        .pipe(Effect.runPromise);

export default architect;

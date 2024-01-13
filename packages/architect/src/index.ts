import Dockerode from "dockerode";
import DockerModem from "docker-modem";
import { Effect, Option, Scope } from "effect";

import {
    dockerClient,
    DockerServiceLive,
    type DockerError,
    type DockerService,
    type DockerStreamResponse,
    type DockerConnectionOptions,
} from "./docker.js";

import {
    installApk,
    buildImage,
    populateSharedDataVolume,
    buildFreshContainer,
    getExposedEmulatorEndpoints,
    type IArchitectPortBindings,
    type IExposedArchitectEndpoints,
} from "./docker-helpers/all.js";

// Possibly Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

/** @internal */
interface IArchitectOptions {
    // Configurable parts of the container
    networkMode?: string | undefined;
    environmentVariables?: string[] | undefined;
    portBindings?: Partial<IArchitectPortBindings> | undefined;
    onBuildProgress?: ((object: DockerStreamResponse) => void) | undefined;

    // Docker host things
    dockerConnectionOptions?: DockerConnectionOptions | undefined;
}

/** @internal */
interface IArchitectReturnType {
    sharedVolume: Dockerode.Volume;
    emulatorContainer: Dockerode.Container;
    installApk: (apk: string) => Promise<void>;
    containerEndpoints: IExposedArchitectEndpoints;
}

/** @internal */
export const architectEffect = (
    options?: IArchitectOptions | undefined
): Effect.Effect<Scope.Scope | DockerService, DockerError, IArchitectReturnType> =>
    Effect.gen(function* (_: Effect.Adapter) {
        // Generate a random container name which will be architectXXXXXX
        const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;
        const docker: Dockerode = yield* _(dockerClient(options?.dockerConnectionOptions));
        const dockerHost: string = (docker.modem as DockerModem.ConstructorOptions).host || "localhost";
        const dockerDaemon: string =
            (docker.modem as DockerModem.ConstructorOptions).socketPath || "/var/run/docker.sock";

        yield* _(Effect.log(`Connected to docker daemon ${dockerDaemon} @ ${dockerHost}`));
        yield* _(buildImage({ onProgress: Option.fromNullable(options?.onBuildProgress) }));

        const sharedVolume: Dockerode.Volume = yield* _(populateSharedDataVolume());

        const emulatorContainer: Dockerode.Container = yield* _(
            buildFreshContainer({
                containerName,
                networkMode: options?.networkMode,
                portBindings: options?.portBindings || {},
                environmentVariables: options?.environmentVariables || [],
            })
        );

        const containerEndpoints: IExposedArchitectEndpoints = yield* _(
            getExposedEmulatorEndpoints({ emulatorContainer })
        );

        return {
            sharedVolume,
            emulatorContainer,
            containerEndpoints: containerEndpoints,
            installApk: (apk: string) => Effect.runPromise(installApk({ apk, container: emulatorContainer })),
        };
    });

export const architect = (options?: IArchitectOptions | undefined): Promise<IArchitectReturnType> =>
    architectEffect(options)
        .pipe(Effect.scoped)
        .pipe(Effect.provide(DockerServiceLive))
        .pipe(Effect.orDie)
        .pipe(Effect.runPromise);

export default architect;

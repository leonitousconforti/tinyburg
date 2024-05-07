import * as Socket from "@effect/platform/Socket";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as MobyApi from "the-moby-effect";

import {
    buildFreshContainer,
    buildImage,
    getExposedEmulatorEndpoints,
    installApk,
    populateSharedDataVolume,
    type IArchitectPortBindings,
    type IExposedArchitectEndpoints,
} from "./docker-helpers/all.js";

// Possibly Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

interface IArchitectOptions {
    // Configurable parts of the container
    networkMode?: string | undefined;
    environmentVariables?: string[] | undefined;
    portBindings?: Partial<IArchitectPortBindings> | undefined;
}

interface IArchitectReturnType {
    sharedVolume: MobyApi.Schemas.Volume;
    containerEndpoints: IExposedArchitectEndpoints;
    emulatorContainer: MobyApi.Schemas.ContainerInspectResponse;
    installApk: (
        apk: string
    ) => Effect.Effect<
        void,
        MobyApi.Containers.ContainersError | Socket.SocketError | MobyApi.Execs.ExecsError,
        MobyApi.Containers.Containers | MobyApi.Execs.Execs
    >;
}

export const architect = (
    options?: IArchitectOptions | undefined
): Effect.Effect<
    IArchitectReturnType,
    MobyApi.Images.ImagesError | MobyApi.Volumes.VolumesError | MobyApi.Containers.ContainersError | Error,
    MobyApi.Images.Images | MobyApi.Volumes.Volumes | MobyApi.Containers.Containers
> =>
    Effect.gen(function* () {
        // Generate a random container name which will be architectXXXXXX
        const containerName: string = `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;

        yield* buildImage();

        const sharedVolume: Readonly<MobyApi.Schemas.Volume> = yield* populateSharedDataVolume();

        const emulatorContainer: Readonly<MobyApi.Schemas.ContainerInspectResponse> = yield* buildFreshContainer({
            containerName,
            networkMode: options?.networkMode,
            portBindings: options?.portBindings || {},
            environmentVariables: options?.environmentVariables || [],
        });

        const containerEndpoints: IExposedArchitectEndpoints = yield* getExposedEmulatorEndpoints({
            emulatorContainer,
            dockerHostAddress: "",
        });

        return {
            sharedVolume,
            emulatorContainer,
            containerEndpoints: containerEndpoints,
            installApk: (apk: string) =>
                installApk({ apk, containerId: emulatorContainer.Id! }).pipe(
                    Effect.retry({ schedule: Schedule.recurs(3).pipe(Schedule.addDelay(() => "5 seconds")) })
                ),
        };
    });

export const cleanup = (options: {
    sharedVolume?: MobyApi.Schemas.Volume | undefined;
    emulatorContainer: MobyApi.Schemas.ContainerInspectResponse;
}): Effect.Effect<
    void,
    MobyApi.Containers.ContainersError | MobyApi.Volumes.VolumesError,
    MobyApi.Containers.Containers | MobyApi.Volumes.Volumes
> =>
    Effect.gen(function* () {
        const volumes: MobyApi.Moby.Volumes.Volumes = yield* MobyApi.Volumes.Volumes;
        const containers: MobyApi.Containers.Containers = yield* MobyApi.Containers.Containers;

        yield* containers.kill({ id: options.emulatorContainer.Id! });
        yield* containers.delete({ id: options.emulatorContainer.Id!, force: true, v: true });
        if (options.sharedVolume) yield* volumes.delete({ name: options.sharedVolume.Name });
    });

import type Dockerode from "dockerode";
import type DockerModem from "docker-modem";

import { Effect, Context, Layer, Data } from "effect";

export class DockerError extends Data.TaggedError("Docker")<{ message: string }> {}

// Define the interface for the Docker service
export interface DockerService {
    readonly modem: Effect.Effect<never, DockerError, DockerModem>;

    readonly getVolume: (name: string) => Dockerode.Volume;
    readonly getContainer: (name: string) => Dockerode.Container;

    readonly listVolumes: (
        options: unknown
    ) => Effect.Effect<never, DockerError, { Volumes: Dockerode.VolumeInspectInfo[] }>;
    readonly listContainers: (options: unknown) => Effect.Effect<never, DockerError, Dockerode.ContainerInfo[]>;

    readonly createContainer: (
        options: Dockerode.ContainerCreateOptions
    ) => Effect.Effect<never, DockerError, Dockerode.Container>;
    readonly createVolume: (
        options: Dockerode.VolumeCreateOptions
    ) => Effect.Effect<never, DockerError, Dockerode.VolumeCreateResponse>;

    readonly buildImage: (
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        options?: Dockerode.ImageBuildOptions | undefined
    ) => Effect.Effect<never, DockerError, NodeJS.ReadableStream>;
}

// Create a tag for the Docker service
export const DockerService = Context.Tag<DockerService>();

export const DockerServiceLive = Layer.succeed(DockerService, DockerService.of({}));

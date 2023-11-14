import Dockerode from "dockerode";
import { Effect, Context, Layer, Data, Option } from "effect";

/**
 * Custom Docker options type for dockerode that allows us to specify the ssh
 * agent correctly.
 */
export type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/** Docker stream response type */
export type DockerStreamResponse = Readonly<{ stream: string } | { aux: { ID: string } }>;

export class DockerError extends Data.TaggedError("Docker")<{ message: string }> {}

const acquireDockerClient = (
    dockerConnectionOptions?: DockerConnectionOptions | undefined
): Effect.Effect<never, DockerError, Dockerode> =>
    Effect.try({
        try: () => new Dockerode(dockerConnectionOptions),
        catch: (error) => new DockerError({ message: `${error}` }),
    });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const dockerClient = (dockerConnectionOptions?: DockerConnectionOptions | undefined) =>
    Effect.acquireRelease(acquireDockerClient(dockerConnectionOptions), (_client) => Effect.succeed(1));

export interface DockerService {
    readonly getVolume: (client: Dockerode, name: string) => Effect.Effect<never, DockerError, Dockerode.Volume>;
    readonly getContainer: (client: Dockerode, name: string) => Effect.Effect<never, DockerError, Dockerode.Container>;

    readonly listVolumes: (
        client: Dockerode,
        options: unknown
    ) => Effect.Effect<never, DockerError, Dockerode.VolumeInspectInfo[]>;
    readonly listContainers: (
        client: Dockerode,
        options: unknown
    ) => Effect.Effect<never, DockerError, Dockerode.ContainerInfo[]>;

    readonly createContainer: (
        client: Dockerode,
        options: Dockerode.ContainerCreateOptions
    ) => Effect.Effect<never, DockerError, Dockerode.Container>;
    readonly createVolume: (
        client: Dockerode,
        options: Dockerode.VolumeCreateOptions
    ) => Effect.Effect<never, DockerError, Dockerode.VolumeCreateResponse>;

    readonly buildImage: (
        client: Dockerode,
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        options?: Dockerode.ImageBuildOptions | undefined
    ) => Effect.Effect<never, DockerError, NodeJS.ReadableStream>;
    readonly followProgress: (
        client: Dockerode,
        buildStream: NodeJS.ReadableStream,
        onProgress: Option.Option<(object: DockerStreamResponse) => void>
    ) => Effect.Effect<never, DockerError, DockerStreamResponse[]>;
}

// eslint-disable-next-line @typescript-eslint/typedef
export const DockerService = Context.Tag<DockerService>();

// eslint-disable-next-line @typescript-eslint/typedef
export const DockerServiceLive = Layer.succeed(
    DockerService,
    DockerService.of({
        getVolume: (client, name) =>
            Effect.try({
                try: () => client.getVolume(name),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),
        getContainer: (client, name) =>
            Effect.try({
                try: () => client.getContainer(name),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),

        listVolumes: (client, options) =>
            Effect.tryPromise({
                try: () => client.listVolumes(options as {}).then((data) => data.Volumes),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),
        listContainers: (client, options) =>
            Effect.tryPromise({
                try: () => client.listContainers(options as {}),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),

        createContainer: (client, options) =>
            Effect.tryPromise({
                try: () => client.createContainer(options),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),
        createVolume: (client, options) =>
            Effect.tryPromise({
                try: () => client.createVolume(options),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),

        buildImage: (client, file, options) =>
            Effect.tryPromise({
                try: () => client.buildImage(file, options),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),
        followProgress: (client, buildStream, onProgress) =>
            Effect.tryPromise({
                try: () =>
                    new Promise((resolve, reject) => {
                        client.modem.followProgress(
                            buildStream,
                            (error: Error | null, responses: DockerStreamResponse[]) =>
                                error ? reject(error) : resolve(responses),
                            Option.getOrUndefined(onProgress)
                        );
                    }),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),
    })
);

import Dockerode from "dockerode";
import { Effect, Context, Layer, Data, Option, Scope } from "effect";

/**
 * Custom Docker options type for dockerode that allows us to specify the ssh
 * agent correctly.
 */
export type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/** Docker stream response type. */
export type DockerStreamResponse = Readonly<
    { stream: string } & { aux: { ID: string } } & { error: string; errorDetail: { code: number; message: string } }
>;

/** Generic docker error. */
export class DockerError extends Data.TaggedError("DockerError")<{ message: string }> {}

/** How to acquire a docker client. */
const acquireDockerClient = (
    dockerConnectionOptions?: DockerConnectionOptions | undefined
): Effect.Effect<never, DockerError, Dockerode> =>
    Effect.try({
        try: () => new Dockerode(dockerConnectionOptions),
        catch: (error) => new DockerError({ message: `AcquireDockerClientError ${error}` }),
    });

/** Scoped docker client resource. */
export const dockerClient = (
    dockerConnectionOptions?: DockerConnectionOptions | undefined
): Effect.Effect<Scope.Scope, DockerError, Dockerode> =>
    Effect.acquireRelease(acquireDockerClient(dockerConnectionOptions), (_client) =>
        Effect.succeed(1 as unknown as void)
    );

/** Wraps a dockerode function in an effect try promise call. */
const effectDockerWrapper = <
    DockerodeFunctions extends {
        [K in keyof Dockerode as Dockerode[K] extends (...arguments_: any[]) => any ? K : never]: Dockerode[K];
    },
    T extends keyof DockerodeFunctions,
    U extends DockerodeFunctions[T] extends (...arguments_: any[]) => any ? DockerodeFunctions[T] : never,
>(
    functionName: T,
    ...arguments_: DockerodeFunctions[T] extends (...arguments_: infer A) => any ? A : never
): Effect.Effect<Scope.Scope, DockerError, Awaited<ReturnType<U>>> => {
    return dockerClient().pipe(
        Effect.flatMap((client) => {
            const result: Promise<any> | any = (client[functionName as keyof Dockerode] as U)(...arguments_);
            return result instanceof Promise
                ? Effect.tryPromise({
                      try: () => result,
                      catch: (error) => new DockerError({ message: `${String(functionName)} ${error}` }),
                  })
                : Effect.try({
                      try: () => result,
                      catch: (error) => new DockerError({ message: `${String(functionName)} ${error}` }),
                  });
        })
    );
};

/** Docker service interface that defines what is available */
export interface DockerService {
    readonly getVolume: (name: string) => Effect.Effect<Scope.Scope, DockerError, Dockerode.Volume>;
    readonly getContainer: (name: string) => Effect.Effect<Scope.Scope, DockerError, Dockerode.Container>;
    readonly listContainers: (options: unknown) => Effect.Effect<Scope.Scope, DockerError, Dockerode.ContainerInfo[]>;
    readonly listVolumes: (
        options: unknown
    ) => Effect.Effect<Scope.Scope, DockerError, { Volumes: Dockerode.VolumeInspectInfo[] }>;

    readonly inspectContainer: (
        container: Dockerode.Container
    ) => Effect.Effect<never, DockerError, Dockerode.ContainerInspectInfo>;

    readonly createContainer: (
        options: Dockerode.ContainerCreateOptions
    ) => Effect.Effect<Scope.Scope, DockerError, Dockerode.Container>;
    readonly createVolume: (
        options: Dockerode.VolumeCreateOptions
    ) => Effect.Effect<Scope.Scope, DockerError, Dockerode.VolumeCreateResponse>;

    readonly buildImage: (
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        options?: Dockerode.ImageBuildOptions | undefined
    ) => Effect.Effect<Scope.Scope, DockerError, NodeJS.ReadableStream>;
    readonly followProgress: (
        buildStream: NodeJS.ReadableStream,
        onProgress: Option.Option<(object: DockerStreamResponse) => void>
    ) => Effect.Effect<Scope.Scope, DockerError, DockerStreamResponse[]>;
}

/** Docker service tag */
export const DockerService: Context.Tag<DockerService, DockerService> = Context.Tag<DockerService>();

/** Docker service implementation */
export const DockerServiceLive: Layer.Layer<never, never, DockerService> = Layer.succeed(
    DockerService,
    DockerService.of({
        getVolume: (name) => effectDockerWrapper("getVolume", name),
        getContainer: (name) => effectDockerWrapper("getContainer", name),
        createVolume: (options) => effectDockerWrapper("createVolume", options),
        createContainer: (options) => effectDockerWrapper("createContainer", options),
        listVolumes: (options) => effectDockerWrapper("listVolumes", options as {}),
        listContainers: (options) => effectDockerWrapper("listContainers", options as {}),
        buildImage: (file, options) => effectDockerWrapper("buildImage", file, options),

        inspectContainer: (container) =>
            Effect.tryPromise({
                try: () => container.inspect(),
                catch: (error) => new DockerError({ message: `${error}` }),
            }),

        /** Streams the build progress */
        followProgress: (buildStream, onProgress) =>
            Effect.gen(function* (_: Effect.Adapter) {
                const client: Dockerode = yield* _(dockerClient());

                const followProgressPromise = (): Promise<DockerStreamResponse[]> =>
                    new Promise((resolve, reject) => {
                        client.modem.followProgress(
                            buildStream,
                            (error: Error | null, responses: DockerStreamResponse[]) =>
                                error || responses.at(-1)?.error
                                    ? reject(error || responses.at(-1)?.error)
                                    : resolve(responses),
                            Option.getOrUndefined(onProgress)
                        );
                    });

                const followProgressEffect: Effect.Effect<never, DockerError, DockerStreamResponse[]> =
                    Effect.tryPromise({
                        try: followProgressPromise,
                        catch: (error) => new DockerError({ message: `FollowProgressError ${error}` }),
                    });

                return yield* _(followProgressEffect);
            }),
    })
);

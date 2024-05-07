import * as url from "node:url";
import * as tar from "tar-fs";

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as MobyApi from "the-moby-effect";

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
    networkMode: string | undefined;
    portBindings: Partial<IArchitectPortBindings>;
}): Effect.Effect<
    MobyApi.Schemas.ContainerInspectResponse,
    MobyApi.Containers.ContainersError | MobyApi.Images.ImagesError,
    MobyApi.Containers.Containers | MobyApi.Images.Images
> =>
    Effect.gen(function* () {
        // For building the image
        const context: url.URL = new URL("../../emulator", import.meta.url);
        const tarStream: tar.Pack = tar.pack(url.fileURLToPath(context));

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

        yield* Effect.log("Creating emulator container from image with kvm acceleration enabled");
        const containerOptions: MobyApi.Containers.ContainerCreateOptions = containerCreateOptions({
            networkMode,
            containerName,
            environmentVariables,
            command: Option.none(),
            portBindings: PortBindings,
        });

        return yield* MobyApi.Docker.run({
            containerOptions,
            imageOptions: {
                kind: "build",
                context: Stream.fromAsyncIterable(
                    tarStream,
                    () =>
                        new MobyApi.Images.ImagesError({
                            method: "Pack",
                            message: "error packing the build context",
                        })
                ),
            },
        }).pipe(Effect.scoped);
    });

export default buildFreshContainer;

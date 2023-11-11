import tar from "tar-fs";
import url from "node:url";
import Dockerode from "dockerode";
import { Effect, Option } from "effect";

import {
    DOCKER_IMAGE_TAG,
    EMULATOR_VERSION,
    MITM_PROXY_VERSION,
    ENVOY_PROXY_VERSION,
    FRIDA_SERVER_VERSION,
    ANDROID_SDK_TOOLS_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
} from "../versions.js";
import { DockerError } from "./all.js";

// Docker stream response type
type DockerStreamResponse = Readonly<{ stream: string } | { aux: { ID: string } }>;

/** Build arguments that must be provided for the architect docker image */
export interface IArchitectDockerImageBuildArguments {
    EMULATOR_VERSION: string;
    MITM_PROXY_VERSION: string;
    ENVOY_PROXY_VERSION: string;
    FRIDA_SERVER_VERSION: string;
    ANDROID_SDK_TOOLS_VERSION: string;
    EMULATOR_SYSTEM_IMAGE_VERSION: string;
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT: string;
}

/**
 * Builds the docker image for the architect emulator container.
 *
 * @internal
 */
export const buildImage = ({
    dockerode,
    onProgress,
}: {
    dockerode: Dockerode;
    onProgress: Option.Option<(object: DockerStreamResponse) => unknown>;
}): Effect.Effect<never, DockerError, DockerStreamResponse[]> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const context: url.URL = new URL("../../emulator", import.meta.url);
        const tarStream: tar.Pack = tar.pack(url.fileURLToPath(context));

        const buildStream: NodeJS.ReadableStream = yield* _(
            Effect.promise(() =>
                dockerode.buildImage(tarStream, {
                    t: DOCKER_IMAGE_TAG,
                    buildargs: {
                        EMULATOR_VERSION,
                        MITM_PROXY_VERSION,
                        ENVOY_PROXY_VERSION,
                        FRIDA_SERVER_VERSION,
                        ANDROID_SDK_TOOLS_VERSION,
                        EMULATOR_SYSTEM_IMAGE_VERSION,
                        EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
                    } satisfies IArchitectDockerImageBuildArguments,
                })
            )
        );

        return yield* _(
            Effect.promise(
                (): Promise<DockerStreamResponse[]> =>
                    new Promise((resolve, reject) => {
                        dockerode.modem.followProgress(
                            buildStream,
                            (error: Error | null, responses: DockerStreamResponse[]) =>
                                error ? reject(error) : resolve(responses),
                            Option.getOrUndefined(onProgress)
                        );
                    })
            )
        );
    }).pipe(Effect.catchAll((error: unknown) => new DockerError({ message: `${error}` })));

export default buildImage;

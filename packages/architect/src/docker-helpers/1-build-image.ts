import tar from "tar-fs";
import url from "node:url";
import Dockerode from "dockerode";
import { Effect, Option, Scope } from "effect";

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
import { dockerClient, DockerError, DockerService, DockerStreamResponse } from "../docker.js";

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
    onProgress,
}: {
    onProgress: Option.Option<(object: DockerStreamResponse) => void>;
}): Effect.Effect<Scope.Scope | DockerService, DockerError, DockerStreamResponse[]> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const dockerode: Dockerode = yield* _(dockerClient());
        const dockerService: DockerService = yield* _(DockerService);

        const context: url.URL = new URL("../../emulator", import.meta.url);
        const tarStream: tar.Pack = tar.pack(url.fileURLToPath(context));

        const buildStream: NodeJS.ReadableStream = yield* _(
            dockerService.buildImage(dockerode, tarStream, {
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
        );

        return yield* _(dockerService.followProgress(dockerode, buildStream, onProgress));
    });

export default buildImage;

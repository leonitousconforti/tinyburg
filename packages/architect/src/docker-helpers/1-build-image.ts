import * as url from "node:url";
import * as tar from "tar-fs";

import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as MobyApi from "the-moby-effect";

import {
    ANDROID_SDK_TOOLS_VERSION,
    DOCKER_IMAGE_TAG,
    EMULATOR_SYSTEM_IMAGE_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
    EMULATOR_VERSION,
    ENVOY_PROXY_VERSION,
    FRIDA_SERVER_VERSION,
    MITM_PROXY_VERSION,
} from "../versions.js";

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
export const buildImage = (): Effect.Effect<void, MobyApi.Images.ImagesError, MobyApi.Images.Images> =>
    Effect.gen(function* () {
        const images: MobyApi.Images.Images = yield* MobyApi.Images.Images;

        const context: url.URL = new URL("../../emulator", import.meta.url);
        const tarStream: tar.Pack = tar.pack(url.fileURLToPath(context));

        yield* Effect.logInfo(
            `Building docker image from context ${context.toString()}, will tag image as ${DOCKER_IMAGE_TAG} when finished`
        );

        const buildArguments: IArchitectDockerImageBuildArguments = {
            EMULATOR_VERSION,
            MITM_PROXY_VERSION,
            ENVOY_PROXY_VERSION,
            FRIDA_SERVER_VERSION,
            ANDROID_SDK_TOOLS_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
        };

        const buildStream: Stream.Stream<MobyApi.Schemas.BuildInfo, MobyApi.Images.ImagesError, never> =
            yield* images.build({
                t: DOCKER_IMAGE_TAG,
                buildargs: JSON.stringify(buildArguments),
                context: Stream.fromAsyncIterable(
                    tarStream,
                    () =>
                        new MobyApi.Images.ImagesError({
                            method: "Pack",
                            message: "error packing the build context",
                        })
                ),
            });

        yield* Stream.runDrain(buildStream);
    }).pipe(Effect.scoped);

export default buildImage;

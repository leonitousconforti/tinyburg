import tar from "tar-fs";
import Debug from "debug";
import url from "node:url";
import Dockerode from "dockerode";

import {
    DOCKER_IMAGE_TAG,
    EMULATOR_VERSION,
    SDK_TOOLS_VERSION,
    MITM_PROXY_VERSION,
    ENVOY_PROXY_VERSION,
    FRIDA_SERVER_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
} from "../versions.js";

/** Build arguments that must be provided for the architect docker image */
export interface IArchitectDockerImageBuildArguments {
    EMULATOR_VERSION: string;
    SDK_TOOLS_VERSION: string;
    MITM_PROXY_VERSION: string;
    ENVOY_PROXY_VERSION: string;
    FRIDA_SERVER_VERSION: string;
    EMULATOR_SYSTEM_IMAGE_VERSION: string;
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT: string;
}

/** Builds the docker image for the architect emulator container. */
export const buildImage = async ({
    dockerode,
    logger,
    abortSignal,
    onProgress,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    abortSignal?: AbortSignal | undefined;
    onProgress?: ((object: { stream: string } | { aux: { ID: string } }) => void) | undefined;
}): Promise<({ stream: string } | { aux: { ID: string } })[]> => {
    const context: url.URL = new URL("../../emulator", import.meta.url);
    const tarStream: tar.Pack = tar.pack(url.fileURLToPath(context));
    logger(
        "Building docker image from context %s, will tag image as %s when finished",
        context.toString(),
        DOCKER_IMAGE_TAG
    );

    logger("Subsequent calls should be much faster as this image will be cached");
    const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(tarStream, {
        ...(abortSignal ? { abortSignal } : {}),
        t: DOCKER_IMAGE_TAG,
        buildargs: {
            EMULATOR_VERSION,
            SDK_TOOLS_VERSION,
            MITM_PROXY_VERSION,
            ENVOY_PROXY_VERSION,
            FRIDA_SERVER_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
        } satisfies IArchitectDockerImageBuildArguments,
    });

    return new Promise((resolve, reject) => {
        dockerode.modem.followProgress(
            buildStream,
            (error: Error | null, responses: ({ stream: string } | { aux: { ID: string } })[]) =>
                error ? reject(error) : resolve(responses),
            onProgress
        );
    });
};

export default buildImage;

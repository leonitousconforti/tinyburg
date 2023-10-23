import tar from "tar-fs";
import Debug from "debug";
import url from "node:url";
import Dockerode from "dockerode";

import {
    EMULATOR_VERSION,
    SDK_TOOLS_VERSION,
    ENVOY_PROXY_VERSION,
    FRIDA_SERVER_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION,
    EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
    DOCKER_IMAGE_TAG,
} from "../versions.js";

/** Builds the docker image for the architect emulator container. */
export const buildImage = async ({
    dockerode,
    logger,
    abortSignal,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    abortSignal: AbortSignal;
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
        abortSignal,
        t: DOCKER_IMAGE_TAG,
        buildargs: {
            EMULATOR_VERSION,
            SDK_TOOLS_VERSION,
            ENVOY_PROXY_VERSION,
            FRIDA_SERVER_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION,
            EMULATOR_SYSTEM_IMAGE_VERSION_SHORT,
        },
    });

    // TODO: Maybe report build progress in console
    return new Promise((resolve, reject) => {
        dockerode.modem.followProgress(
            buildStream,
            (error: Error | null, responses: ({ stream: string } | { aux: { ID: string } })[]) =>
                error ? reject(error) : resolve(responses)
            // (object: { stream: string } | { aux: { ID: string } }) => logger(object)
        );
    });
};

export default buildImage;

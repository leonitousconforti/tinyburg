import tar from "tar-fs";
import Debug from "debug";
import url from "node:url";
import Dockerode from "dockerode";
import { DOCKER_IMAGE_TAG } from "../versions.js";

export const buildImage = async ({
    dockerode,
    logger,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
}): Promise<({ stream: string } | { aux: { ID: string } })[]> => {
    const context = new URL("../../emulator", import.meta.url);
    const tarStream = tar.pack(url.fileURLToPath(context));
    logger(
        "Building docker image from context %s, will tag image as %s when finished",
        context.toString(),
        DOCKER_IMAGE_TAG
    );
    logger("Subsequent calls should be much faster as this image will be cached");

    const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(tarStream, { t: DOCKER_IMAGE_TAG });
    return new Promise((resolve, reject) => {
        dockerode.modem.followProgress(
            buildStream,
            (error: Error | null, responses: ({ stream: string } | { aux: { ID: string } })[]) =>
                error ? reject(error) : resolve(responses)
        );
    });
};

export default buildImage;

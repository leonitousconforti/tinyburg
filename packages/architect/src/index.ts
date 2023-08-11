import dotenv from "dotenv";
dotenv.config({ override: false, path: new URL("../.env", import.meta.url) });

import type DockerModem from "docker-modem";

import tar from "tar-fs";
import Debug from "debug";
import url from "node:url";
import Dockerode from "dockerode";
import { ArchitectServices } from "./resources.js";

const logger: Debug.Debugger = Debug.debug("tinyburg:architect");
const tag: string =
    "ghcr.io/leonitousconforti/tinyburg/architect_emulator:10086546_sys-30-google-apis-x64-r12_frida-16.0.19";

// Override the docker host environment variable
if (process.env["ARCHITECT_DOCKER_HOST"] !== undefined) {
    process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"];
}

/** The port bindings that all architect emulator containers must have. */
interface IArchitectPortBindings {
    "5554/tcp"?: Dockerode.PortBinding[];
    "5555/tcp"?: Dockerode.PortBinding[];
    "8554/tcp"?: Dockerode.PortBinding[];
    "27042/tcp"?: Dockerode.PortBinding[];
}

interface IWaitForOptions {
    globalWaitMs?: number;
    globalRetries?: number;
    waitForFridaToStart?: { skip?: boolean; waitMs?: number; retries?: number };
    waitForFridaToBeReachable?: { skip?: boolean; waitMs?: number; retries?: number };
    waitForContainerToBeHealthy?: { skip?: boolean; waitMs?: number; retries?: number };
}

/**
 * Custom Docker options type for dockerode that allows us to specify the ssh
 * agent correctly.
 */
export type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/** Generates a random name for an architect container/service */
export const generateContainerName = (): string =>
    `architect${Math.floor(Math.random() * (999_999 - 100_000 + 1)) + 100_000}`;

/**
 * Builds the emulator image using the docker host provided by dockerode.
 *
 * @param dockerode - The dockerode instance to use to build the image
 * @param containerName - The name for the emulator container
 * @param portBindings - The port bindings to use for the emulator container
 */
const buildFreshContainer = async (
    dockerode: Dockerode,
    containerName: string = generateContainerName(),
    portBindings?: IArchitectPortBindings
): Promise<ArchitectServices> => {
    const context = new URL("../emulator", import.meta.url);
    const tarStream = tar.pack(url.fileURLToPath(context));
    logger("Building docker image from context %s, will tag image as %s when finished", context.toString(), tag);
    logger("Subsequent calls should be much faster as this image will be cached");
    const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(tarStream, { t: tag });

    // Wait for build to finish
    await new Promise((resolve, reject) => {
        dockerode.modem.followProgress(buildStream, (error, response) => (error ? reject(error) : resolve(response)));
    });

    // Merge port bindings, 0 means pick a random unused port
    const PortBindings = Object.assign(
        {},
        {
            "5554/tcp": [{ HostPort: "0" }],
            "5555/tcp": [{ HostPort: "0" }],
            "8554/tcp": [{ HostPort: "0" }],
            "27042/tcp": [{ HostPort: "0" }],
        },
        portBindings || {}
    );

    logger("Creating data volume for emulator data");
    const emulatorDataVolume = (await dockerode.createVolume({
        Driver: "local",
        Name: `${containerName}_emulator_data`,
    })) as unknown as Dockerode.Volume;

    logger("Creating container from image with kvm acceleration enabled");
    const container: Dockerode.Container = await dockerode.createContainer({
        name: containerName,
        Image: tag,
        Volumes: { "/android/avd-home/Pixel2.avd/": {} },
        HostConfig: {
            Binds: [`${containerName}_emulator_data:/android/avd-home/Pixel2.avd/`],
            PortBindings,
            Devices: [
                {
                    CgroupPermissions: "mrw",
                    PathInContainer: "/dev/kvm",
                    PathOnHost: "/dev/kvm",
                },
            ],
        },
    });

    logger("Starting container %s", container.id);
    await container.start();
    return new ArchitectServices(dockerode, containerName, container, [emulatorDataVolume]);
};

/**
 * Finds an existing container that is already running with the architect image.
 *
 * @param dockerode - The dockerode instance to use to find the container
 * @param containerName - The name of the container to find
 * @param portBindings - The port bindings to use for the emulator container
 */
const findExistingContainerOrCreateNew = async (
    dockerode: Dockerode,
    containerName?: string,
    portBindings?: IArchitectPortBindings
): Promise<ArchitectServices> => {
    logger("Searching for already started container with image %s and container name %s...", tag, containerName);
    const runningContainers = await dockerode.listContainers({ all: true });
    const foundContainerId = runningContainers.find(
        (container) =>
            container.Image === tag && (containerName === undefined || container.Names.includes(`/${containerName}`))
    )?.Id;

    if (foundContainerId) {
        const foundContainer = dockerode.getContainer(foundContainerId);
        const { Name: foundContainerName, State: foundContainerState } = await foundContainer.inspect();
        const foundContainerNameNoSlash = foundContainerName.replace("/", "");
        const foundContainerVolume = dockerode.getVolume(`${foundContainerNameNoSlash}_emulator_data`);
        logger("Found container %s, reusing it", foundContainerNameNoSlash);

        if (!foundContainerState.Running) {
            await foundContainer.start();
        }

        const otherResources = [foundContainerVolume];
        return new ArchitectServices(dockerode, foundContainerNameNoSlash, foundContainer, otherResources);
    }

    return buildFreshContainer(dockerode, containerName, portBindings);
};

/**
 * Allocates an emulator container on a local or remote docker host that has kvm
 * acceleration capabilities. Provides convince functions for interacting with
 * the container. Additionally, has the ability to allocate all the additional
 * services required to interact with the container from a web browser.
 */
export const architect = async (options?: {
    reuseExistingContainers?: boolean | undefined;
    dockerConnectionOptions?: DockerConnectionOptions | undefined;
    emulatorContainerName?: string | undefined;
    portBindings?: IArchitectPortBindings | undefined;
    waitForOptions?: IWaitForOptions | undefined;
}): Promise<
    {
        emulatorServices: ArchitectServices;
    } & Awaited<ReturnType<InstanceType<typeof ArchitectServices>["getExposedEmulatorEndpoints"]>>
> => {
    const dockerConnectionOptions = Object.assign(
        { socketPath: "/var/run/docker.sock" },
        options?.dockerConnectionOptions || {}
    );
    const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
    logger(
        "Connected to docker daemon %s @ %s",
        dockerConnectionOptions.socketPath,
        (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost"
    );

    const emulatorContainerName = options?.emulatorContainerName;
    const emulatorServices = options?.reuseExistingContainers
        ? await findExistingContainerOrCreateNew(dockerode, emulatorContainerName, options?.portBindings)
        : await buildFreshContainer(dockerode, emulatorContainerName, options?.portBindings);

    if (!options?.waitForOptions?.waitForContainerToBeHealthy?.skip) {
        await emulatorServices.waitForContainerToBeHealthy(
            options?.waitForOptions?.waitForContainerToBeHealthy?.retries || options?.waitForOptions?.globalRetries,
            options?.waitForOptions?.waitForContainerToBeHealthy?.waitMs || options?.waitForOptions?.globalWaitMs
        );
    }
    if (!options?.waitForOptions?.waitForFridaToStart?.skip) {
        await emulatorServices.startFridaServer(
            options?.waitForOptions?.waitForFridaToStart?.retries || options?.waitForOptions?.globalRetries,
            options?.waitForOptions?.waitForFridaToStart?.waitMs || options?.waitForOptions?.globalWaitMs
        );
    }
    if (!options?.waitForOptions?.waitForFridaToBeReachable?.skip) {
        await emulatorServices.waitForFridaToBeReachable(
            options?.waitForOptions?.waitForFridaToBeReachable?.retries || options?.waitForOptions?.globalRetries,
            options?.waitForOptions?.waitForFridaToBeReachable?.waitMs || options?.waitForOptions?.globalWaitMs
        );
    }

    logger("Everything is healthy, you can start connecting to it now!");
    const emulatorEndpoints = await emulatorServices.getExposedEmulatorEndpoints();

    return {
        emulatorServices,
        ...emulatorEndpoints,
    };
};

export default architect;
export { ArchitectServices } from "./resources.js";

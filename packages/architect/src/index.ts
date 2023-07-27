import type DockerModem from "docker-modem";

import fs from "node:fs";
import url from "node:url";

import tar from "tar-fs";
import Debug from "debug";
import Dockerode from "dockerode";
import DockerodeCompose from "dockerode-compose";
import { ArchitectEmulatorServices, ArchitectDataVolume } from "./resources.js";

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
 * @param architectDataDirectory - Path on the docker host to put emulator files
 * @param portBindings - The port bindings to use for the emulator container
 * @returns The started container and its data volume if one was made
 */
const buildFreshContainer = async (
    dockerode: Dockerode,
    containerName: string = generateContainerName(),
    architectDataDirectory?: fs.PathLike,
    portBindings?: IArchitectPortBindings
): Promise<[emulatorContainer: ArchitectEmulatorServices, emulatorVolume: ArchitectDataVolume]> => {
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

    const emulatorDataVolume = await ArchitectDataVolume.createNew(dockerode, containerName, architectDataDirectory);

    logger("Creating container from image with kvm acceleration enabled");
    const container: Dockerode.Container = await dockerode.createContainer({
        name: containerName,
        Image: tag,
        Volumes: { "/android/avd-home/Pixel2.avd/": {} },
        HostConfig: {
            Binds: [`${containerName}:/android/avd-home/Pixel2.avd/`],
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
    return [new ArchitectEmulatorServices(dockerode, container), emulatorDataVolume];
};

/**
 * Builds the emulator image and all the additional services using docker
 * compose.
 *
 * @param dockerode - The dockerode instance to use to build the images
 * @returns The main emulator container
 */
const buildFreshContainerWithServices = async (
    dockerode: Dockerode
): Promise<[emulatorContainer: ArchitectEmulatorServices, emulatorVolume: ArchitectDataVolume]> => {
    const dockerComposeServiceName = generateContainerName();
    logger(
        "Starting architect with additional services using docker compose, service name will be %s",
        dockerComposeServiceName
    );
    const dockerodeCompose: DockerodeCompose = new DockerodeCompose(
        dockerode,
        url.fileURLToPath(new URL("../docker-compose.yaml", import.meta.url)),
        dockerComposeServiceName
    );

    const compose = await dockerodeCompose.up();
    const volumes = compose.volumes as Dockerode.Volume[];
    const containers = compose.services as Dockerode.Container[];
    const containerInspections = await Promise.all(containers.map((container) => container.inspect()));
    const containerId = containerInspections.find((container) => container.Config.Image === tag)!.Id;

    return [
        new ArchitectEmulatorServices(dockerode, dockerode.getContainer(containerId)),
        ArchitectDataVolume.createFromExisting(dockerode, volumes?.[0]!),
    ];
};

/**
 * Finds an existing container that is already running with the architect image.
 *
 * @param dockerode - The dockerode instance to use to find the container
 * @returns The id of the found container or undefined if none was found
 */
const findExistingContainerOrCreateNew = async (
    dockerode: Dockerode,
    containerName?: string,
    architectDataDirectory?: fs.PathLike,
    portBindings?: IArchitectPortBindings
): Promise<[emulatorContainer: ArchitectEmulatorServices, emulatorVolume: ArchitectDataVolume]> => {
    logger("Searching for already started container with image %s...", tag);
    const runningContainers = await dockerode.listContainers();
    const foundContainerId = runningContainers.find(
        (container) =>
            container.Image === tag && (containerName === undefined || container.Names.includes(containerName))
    )?.Id;

    if (foundContainerId) {
        const foundContainer = dockerode.getContainer(foundContainerId);
        const { Name: foundContainerName } = await foundContainer.inspect();
        return [
            new ArchitectEmulatorServices(dockerode, foundContainer),
            ArchitectDataVolume.createFromExisting(dockerode, dockerode.getVolume(foundContainerName)),
        ];
    }

    return buildFreshContainer(dockerode, containerName, architectDataDirectory, portBindings);
};

/**
 * Allocates an emulator container on a local or remote docker host that has kvm
 * acceleration capabilities. Provides convince functions for interacting with
 * the container. Additionally, has the ability to allocate all the additional
 * services required to interact with the container from a web browser.
 */
export const architect = async (options?: {
    withAdditionalServices?: boolean | undefined;
    reuseExistingContainers?: boolean | undefined;
    dockerConnectionOptions?: DockerConnectionOptions | undefined;
    emulatorDataDirectory?: fs.PathLike | undefined;
    emulatorContainerName?: string | undefined;
    portBindings?: IArchitectPortBindings | undefined;
}): Promise<
    {
        emulatorServices: ArchitectEmulatorServices;
        emulatorDataVolume: ArchitectDataVolume;
    } & Awaited<ReturnType<InstanceType<typeof ArchitectEmulatorServices>["getExposedEmulatorEndpoints"]>>
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

    const emulatorContainerName = options?.emulatorContainerName ?? generateContainerName();
    const architectDataDirectory = options?.emulatorDataDirectory ?? process.env["ARCHITECT_DATA_DIRECTORY"];
    const [emulatorServices, emulatorDataVolume] = options?.withAdditionalServices
        ? await buildFreshContainerWithServices(dockerode)
        : options?.reuseExistingContainers
        ? await findExistingContainerOrCreateNew(
              dockerode,
              emulatorContainerName,
              architectDataDirectory,
              options?.portBindings
          )
        : await buildFreshContainer(dockerode, emulatorContainerName, architectDataDirectory, options?.portBindings);

    const emulatorEndpoints = await emulatorServices.getExposedEmulatorEndpoints();
    await emulatorServices.waitForContainerToBeHealthy();
    await emulatorServices.waitForFridaToBeReachable(emulatorEndpoints.fridaAddress);
    logger("Everything is healthy, you can start connecting to it now!");

    return {
        emulatorServices,
        emulatorDataVolume,
        ...emulatorEndpoints,
    };
};

export default architect;
export { ArchitectDataVolume } from "./resources.js";
export { ArchitectEmulatorServices } from "./resources.js";
export { cleanUpAllArchitectResources } from "./resources.js";

import type DockerModem from "docker-modem";

import url from "node:url";
import path from "node:path";

import tar from "tar-fs";
import frida from "frida";
import Debug from "debug";
import Dockerode from "dockerode";
import DockerodeCompose from "dockerode-compose";

const logger: Debug.Debugger = Debug.debug("tinyburg:architect");
const tag: string =
    "ghcr.io/leonitousconforti/tinyburg/architect:emulator-10086546_sys-30-google-apis-x64-r12_frida-16.0.19";

// Override the docker host environment variable
// eslint-disable-next-line dot-notation
process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"] || process.env["DOCKER_HOST"];

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
type DockerConnectionOptions = Omit<Dockerode.DockerOptions, "sshAuthAgent"> & {
    sshOptions?: { agent?: string | undefined };
};

/**
 * Builds the emulator image using the docker host provided by dockerode.
 *
 * @param dockerode - The dockerode instance to use to build the image
 * @param portBindings - The port bindings to use for the container
 * @returns The started container
 */
const buildFreshContainer = async (
    dockerode: Dockerode,
    portBindings?: IArchitectPortBindings
): Promise<Dockerode.Container> => {
    // Build a new docker container
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

    // Create the container
    logger("Creating container from image with kvm acceleration enabled");
    const container = await dockerode.createContainer({
        Image: tag,
        HostConfig: {
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

    // Start the container
    logger("Starting container %s", container.id);
    await container.start();
    return container;
};

/**
 * Builds the emulator image and all the additional services using docker
 * compose.
 *
 * @param dockerode - The dockerode instance to use to build the images
 * @returns The main emulator container
 */
const buildFreshContainerWithServices = async (dockerode: Dockerode): Promise<Dockerode.Container> => {
    logger("Starting architect with additional services using docker compose");
    const dockerodeCompose: DockerodeCompose = new DockerodeCompose(
        dockerode,
        url.fileURLToPath(new URL("../docker-compose.yaml", import.meta.url)),
        "architect"
    );
    const result = await dockerodeCompose.up();
    console.log(result.services);
    throw new Error("Not implemented fully yet");
};

/**
 * Finds an existing container that is already running with the architect image.
 *
 * @param dockerode - The dockerode instance to use to find the container
 * @returns The id of the found container or undefined if none was found
 */
const findExistingContainer = async (
    dockerode: Dockerode,
    portBindings?: IArchitectPortBindings
): Promise<Dockerode.Container> => {
    logger("Searching for already started container with image %s...", tag);
    const runningContainers = await dockerode.listContainers();
    const id = runningContainers.find((container) => container.Image === tag)?.Id;
    return id ? dockerode.getContainer(id) : await buildFreshContainer(dockerode, portBindings);
};

/**
 * Get the addresses that are exposed by the container using port bindings
 * provided when starting the container.
 */
const getExposedContainerEndpoints = async (
    dockerode: Dockerode,
    container: Dockerode.Container
): Promise<{
    containerHost: string;
    adbConsoleAddress: string;
    adbAddress: string;
    grpcAddress: string;
    fridaAddress: string;
}> => {
    const containerHost = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    const inspectResults = await container.inspect();
    const containerPortBindings = inspectResults.NetworkSettings.Ports;
    const adbConsoleAddress = `${containerHost}:${containerPortBindings["5554/tcp"]![0]?.HostPort}`;
    const adbAddress = `${containerHost}:${containerPortBindings["5555/tcp"]![0]?.HostPort}`;
    const grpcAddress = `${containerHost}:${containerPortBindings["8554/tcp"]![0]?.HostPort}`;
    const fridaAddress = `${containerHost}:${containerPortBindings["27042/tcp"]![0]?.HostPort}`;
    return { containerHost, adbConsoleAddress, adbAddress, grpcAddress, fridaAddress };
};

/**
 * Waits for the emulator container's health check to report that the container
 * has entered a healthy state. Will throw early if the container ever dies
 * prematurely but will keep retrying if the container just reports as
 * unhealthy.
 *
 * @param container - The emulator container to inspect
 * @param retries - The maximum number of tries before giving up
 * @param waitMs - The number of milliseconds to wait between retries
 */
const waitForContainerToBeHealthy = async (
    container: Dockerode.Container,
    retries: number = 40,
    waitMs: number = 3000
): Promise<void> => {
    const inspectResult = await container.inspect();
    if (inspectResult.State.Status === "exited") throw new Error("Container exited prematurely");

    // Wrap this in a try-catch because we don't want errors to bubble up
    // because there might be the opportunity to recover from these.
    try {
        if (inspectResult.State.Health?.Status !== "healthy")
            throw new Error(`Container is not healthy, status=${inspectResult.State.Health?.Status}`);
    } catch (error: unknown) {
        // If there are retries remaining, wait for the desired timeout and then recurse
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            return await waitForContainerToBeHealthy(container, retries - 1, waitMs);
        }

        // Otherwise, throw this error to reject the promise
        throw error;
    }
};

/**
 * Waits for the frida server to be reachable. Will keep retrying until the
 * sever is able to list the running processes on the emulator.
 *
 * @param fridaAddress - The frida server to inspect
 * @param retries - The maximum number of tries before giving up
 * @param waitMs - The number of milliseconds to wait between retries
 */
const waitForFridaToBeReachable = async (
    fridaAddress: string,
    retries: number = 20,
    waitMs: number = 3000
): Promise<void> => {
    // Wrap this in a try-catch because we don't want errors to bubble up
    // because there might be the opportunity to recover from these
    try {
        const deviceManager = frida.getDeviceManager();
        const device = await deviceManager.addRemoteDevice(fridaAddress);
        const processes = await device.enumerateProcesses();
        if (!processes) throw new Error("Frida server is not reachable");
    } catch (error: unknown) {
        // Remove the remote device on error because it might be in a bad state
        const deviceManager = frida.getDeviceManager();
        await deviceManager.removeRemoteDevice(fridaAddress);

        // If there are retries remaining, wait for the desired timeout and then recurse
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            return await waitForFridaToBeReachable(fridaAddress, retries - 1, waitMs);
        }

        // Otherwise, throw this error to reject the promise
        throw error;
    }
};

/**
 * Given the path to an apk, will install it into the emulator container. Will
 * replace the existing application (if present), will downgrade the version (if
 * supplied a lower version of the application), allows tests packages and will
 * grant all runtime permissions by default.
 *
 * @see https://developer.android.com/tools/adb
 */
const installApk = async (container: Dockerode.Container, apk: string): Promise<void> => {
    logger("Installing apk %s into container %s...", apk, container.id);
    const tarball = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
    await container.putArchive(tarball, { path: "/android/apks/" });
    const exec = await container.exec({
        Cmd: [
            "/android/sdk/platform-tools/adb",
            "install",
            "-r", // Replace existing application (if present)
            "-t", // Allow test packages
            "-g", // Grant all runtime permissions
            "-d", // Allow downgrade
            `/android/apks/${path.basename(apk)}`,
        ],
    });
    await exec.start({});
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    logger("Done installing apk");
};

/**
 * Will launch the Launcher intent of the com.nimblebit.tinytower application in
 * the emulator. Does not wait/block for the application to load before
 * returning.
 *
 * @see https://stackoverflow.com/questions/4567904/how-to-start-an-application-using-android-adb-tools
 */
const launchGame = async (container: Dockerode.Container): Promise<void> => {
    logger("Launching game");
    const exec = await container.exec({
        Cmd: [
            "/android/sdk/platform-tools/adb",
            "shell",
            "monkey",
            "-p",
            "com.nimblebit.tinytower",
            "-c",
            "android.intent.category.LAUNCHER",
            "1",
        ],
    });
    await exec.start({});
};

/**
 * Allocates an emulator container on a local or remote docker host that has kvm
 * acceleration capabilities. Provides convince functions for interacting with
 * the container.
 */
export const architect = async (options?: {
    reuseExistingContainers?: boolean;
    dockerConnectionOptions?: DockerConnectionOptions;
    portBindings?: IArchitectPortBindings;
}): Promise<
    {
        emulatorContainer: Dockerode.Container;
        launchGame: () => Promise<void>;
        installApk: (apk: string) => Promise<void>;
    } & Awaited<ReturnType<typeof getExposedContainerEndpoints>>
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

    const emulatorContainer = options?.reuseExistingContainers
        ? await findExistingContainer(dockerode, options?.portBindings)
        : await buildFreshContainer(dockerode, options?.portBindings);

    const emulatorEndpoints = await getExposedContainerEndpoints(dockerode, emulatorContainer);
    await waitForContainerToBeHealthy(emulatorContainer);
    await waitForFridaToBeReachable(emulatorEndpoints.fridaAddress);
    logger("Everything is healthy, you can start connecting to it now!");

    return {
        emulatorContainer,
        launchGame: () => launchGame(emulatorContainer),
        installApk: (apk: string) => installApk(emulatorContainer, apk),
        ...emulatorEndpoints,
    };
};

/**
 * Allocates an emulator container as well as all the additional services
 * required to interact with the container from a web browser on a local or
 * remote docker host that has kvm acceleration capabilities. Provides convince
 * functions for interacting with the container.
 */
export const architectWithAdditionalServices = async (
    dockerConnectionOptions: DockerConnectionOptions = {}
): Promise<Dockerode.Container> => {
    const _dockerConnectionOptions = Object.assign({ socketPath: "/var/run/docker.sock" }, dockerConnectionOptions);
    const dockerode: Dockerode = new Dockerode(_dockerConnectionOptions);
    logger(
        "Connected to docker daemon %s @ %s",
        _dockerConnectionOptions.socketPath,
        (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost"
    );
    return buildFreshContainerWithServices(dockerode);
};

export default architect;

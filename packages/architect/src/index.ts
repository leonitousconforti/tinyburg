import type DockerModem from "docker-modem";

import url from "node:url";
import path from "node:path";

import tar from "tar-fs";
import frida from "frida";
import Debug from "debug";
import Dockerode from "dockerode";
import DockerodeCompose from "dockerode-compose";

const logger: Debug.Debugger = Debug.debug("tinyburg:architect");

export const architect = async (options?: {
    withAdditionalServices?: boolean | undefined;
    dockerConnectionOptions?:
        | (Omit<Dockerode.DockerOptions, "sshAuthAgent"> & { sshOptions?: { agent?: string | undefined } })
        | undefined;
    portBindings?:
        | {
              "5554/tcp"?: Dockerode.PortBinding[] | undefined;
              "5555/tcp"?: Dockerode.PortBinding[] | undefined;
              "8554/tcp"?: Dockerode.PortBinding[] | undefined;
              "27042/tcp"?: Dockerode.PortBinding[] | undefined;
          }
        | undefined;
}): Promise<{
    container: Dockerode.Container;
    launchGame: () => Promise<void>;
    installApk: (apk: string) => Promise<void>;
    containerHost: string;
    adbConsoleAddress: string;
    adbAddress: string;
    grpcAddress: string;
    fridaAddress: string;
}> => {
    const dockerConnectionOptions = options?.dockerConnectionOptions || { socketPath: "/var/run/docker.sock" };
    const dockerode: Dockerode = new Dockerode(dockerConnectionOptions);
    const dockerodeCompose: DockerodeCompose = new DockerodeCompose(
        dockerode,
        url.fileURLToPath(new URL("../docker-compose.yaml", import.meta.url)),
        "architect"
    );
    logger(
        "Connected to docker daemon %s @ %s",
        (dockerode.modem as DockerModem.ConstructorOptions).socketPath,
        (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost"
    );
    const tag =
        "ghcr.io/leonitousconforti/tinyburg/architect:emulator-10086546_sys-30-google-apis-x64-r12_frida-16.0.19";

    // Try to find an already running container
    let container: Dockerode.Container;
    logger("Searching for already started container with image %s...", tag);
    const runningContainers = await dockerode.listContainers();
    const runningContainer = runningContainers.find((container) => container.Image === tag);

    // Try to find a running container first
    if (runningContainer) {
        logger("Found an existing docker container that will be reused");
        if (options?.withAdditionalServices) {
            logger("Not starting additional services because an existing container was found");
            logger("If you really do want to start architect with additional services, you should stop this container");
        }
        container = dockerode.getContainer(runningContainer.Id);
    }

    // Otherwise, if we want to start all the additional services
    // bring everything up using docker compose
    else if (options?.withAdditionalServices) {
        logger("Starting architect with additional services using docker compose");
        const result = await dockerodeCompose.up();
        console.log(result.services);
        throw new Error("Not implemented fully yet");
    }

    // Otherwise we just need to start a single architect container
    // with no additional services needed
    else {
        // Build a new docker container
        const context = new URL("../emulator", import.meta.url);
        const tarStream = tar.pack(url.fileURLToPath(context));
        logger("Building docker image from context %s, will tag image as %s when finished", context.toString(), tag);
        logger("Subsequent calls should be much faster as this image will be cached");
        const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(tarStream, { t: tag });

        // Wait for build to finish
        await new Promise((resolve, reject) => {
            dockerode.modem.followProgress(buildStream, (error, response) =>
                error ? reject(error) : resolve(response)
            );
        });

        // Create a container
        logger("Creating container from image with kvm acceleration enabled");
        const PortBindings = Object.assign(
            {},
            {
                "5554/tcp": [{ HostPort: "5554" }],
                "5555/tcp": [{ HostPort: "5555" }],
                "8554/tcp": [{ HostPort: "8554" }],
                "27042/tcp": [{ HostPort: "27042" }],
            },
            options?.portBindings || {}
        );
        container = await dockerode.createContainer({
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
    }

    // Wait for container to become healthy
    logger("Waiting for container to become healthy...");
    let result = await container.inspect();
    while (result.State.Health?.Status !== "healthy") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await container.inspect();
    }
    logger("Emulator is healthy, waiting for frida server to start...");

    const containerHost = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    const containerPortBindings = result.NetworkSettings.Ports;
    const adbConsoleAddress = `${containerHost}:${containerPortBindings["5554/tcp"]![0]?.HostPort}`;
    const adbAddress = `${containerHost}:${containerPortBindings["5555/tcp"]![0]?.HostPort}`;
    const grpcAddress = `${containerHost}:${containerPortBindings["8554/tcp"]![0]?.HostPort}`;
    const fridaAddress = `${containerHost}:${containerPortBindings["27042/tcp"]![0]?.HostPort}`;

    // Wait for frida server to be started
    let processes;
    const deviceManager = frida.getDeviceManager();
    const device = await deviceManager.addRemoteDevice(fridaAddress);
    while (!processes) {
        try {
            processes = await device.enumerateProcesses();
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
    logger("Everything is healthy, you can start connecting to it now!");

    // Install any apk https://developer.android.com/tools/adb
    const installApk = async (apk: string): Promise<void> => {
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

    // https://stackoverflow.com/questions/4567904/how-to-start-an-application-using-android-adb-tools
    const launchGame = async (): Promise<void> => {
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

    return {
        container,
        installApk,
        launchGame,
        containerHost,
        adbConsoleAddress,
        adbAddress,
        grpcAddress,
        fridaAddress,
    };
};

export default architect;

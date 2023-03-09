import url from "node:url";
import path from "node:path";

import tar from "tar-fs";
import Debug from "debug";
import Dockerode from "dockerode";

const logger: Debug.Debugger = Debug.debug("tinyburg:architect");

export const architect = async (): Promise<{
    container: Dockerode.Container;
    launchGame: () => Promise<void>;
    installApk: (apk: string) => Promise<void>;
}> => {
    logger("Attaching to docker socket @ /var/run/docker.sock");

    const context = new URL("../emulator", import.meta.url);
    const dockerode: Dockerode = new Dockerode({ socketPath: "/var/run/docker.sock" });
    const tag = "tinyburg/architect:emulator-9322596_sysimg-31-google-apis-x64_frida-16.0.10";

    // Build a docker container
    logger("Building docker image from context %s, will tag image as %s when finished", context.toString(), tag);
    logger("Subsequent calls should be much faster as this image will be cached");
    const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(
        {
            context: url.fileURLToPath(context),
            src: [
                "Dockerfile",
                "default.pulse-audio",
                "launch-emulator.sh",
                "avd/Pixel2.ini",
                "avd/Pixel2.avd/config.ini",
            ],
        },
        { t: tag }
    );

    // Wait for build to finish
    await new Promise((resolve, reject) => {
        dockerode.modem.followProgress(buildStream, (error, response) => (error ? reject(error) : resolve(response)));
    });

    // Create a container
    logger("Creating container from image with kvm acceleration enabled");
    const container = await dockerode.createContainer({
        Image: tag,
        HostConfig: {
            Devices: [
                {
                    CgroupPermissions: "mrw",
                    PathInContainer: "/dev/kvm",
                    PathOnHost: "/dev/kvm",
                },
            ],
            PortBindings: {
                "5554/tcp": [{ HostPort: "5554" }],
                "5555/tcp": [{ HostPort: "5555" }],
                "8554/tcp": [{ HostPort: "8554" }],
                "27042/tcp": [{ HostPort: "27042" }],
            },
        },
    });

    // Start the container
    logger("Starting container %s", container.id);
    await container.start();

    // Wait for container to become healthy
    logger("Waiting for container %s to become healthy...", container.id);
    let result = await container.inspect();
    while (result.State.Health?.Status !== "healthy") {
        await new Promise((resolve) => setTimeout(resolve, 30_000));
        result = await container.inspect();
    }
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    // Install any apk
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
                "-g", // Allow downgrade
                "-d", // Grant all runtime permissions
                `/android/apks/${path.basename(apk)}`,
            ],
        });
        await exec.start({});
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

    return { container, installApk, launchGame };
};

export default architect;

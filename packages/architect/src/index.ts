import path from "node:url";
import Docker from "dockerode";

export const startContainer = async (apks: string[]): Promise<Docker.Container> => {
    const dockerode: Docker = new Docker({ socketPath: "/var/run/docker.sock" });

    const context = new URL("../emulator", import.meta.url);
    const tag = "tinyburg/architect:emulator-9322596_sysimg-31-google-apis-x64_frida-16.0.8";
    const buildStream: NodeJS.ReadableStream = await dockerode.buildImage(
        {
            context: path.fileURLToPath(context),
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

    await new Promise((resolve, reject) => {
        dockerode.modem.followProgress(
            buildStream,
            (error, response) => (error ? reject(error) : resolve(response)),
            (progress) => (progress.stream ? undefined : undefined)
        );
    });

    const container: Docker.Container = await dockerode.createContainer({
        Image: tag,
        Volumes: {
            "/apks": {},
        },
        HostConfig: {
            Devices: [
                {
                    CgroupPermissions: "mrw",
                    PathInContainer: "/dev/kvm",
                    PathOnHost: "/dev/kvm",
                },
            ],
            Binds: apks.map((apk) => `${apk}:/apks/`),
        },
    });

    await container.start();
    return container;
};

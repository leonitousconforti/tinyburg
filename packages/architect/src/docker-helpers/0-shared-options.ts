import { Option } from "effect";
import Dockerode from "dockerode";

import { DOCKER_IMAGE_TAG, SHARED_EMULATOR_DATA_VOLUME_NAME } from "../versions.js";

/** The port bindings that all architect emulator containers must have. */
export interface IArchitectPortBindings {
    /** Adb console port */
    "5554/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Adb port */
    "5555/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Mitmproxy web interface port */
    "8080/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Envoy proxy admin web interface port */
    "8081/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Emulator grpc port */
    "8554/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Emulator grpc web port */
    "8555/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];

    /** Frida server port */
    "27042/tcp": readonly [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: number }];
}

/**
 * Specifies the docker options for creating an architect container. You must
 * provide a name for the container and you can optionally provide the
 * entrypoint command, network mode, port bindings, and environment variables.
 *
 * @internal
 */
export const containerCreateOptions = ({
    containerName,
    command,
    networkMode,
    portBindings,
    environmentVariables,
}: {
    containerName: string;
    environmentVariables: string[];
    command: Option.Option<string[]>;
    networkMode: Option.Option<string>;
    portBindings: Partial<IArchitectPortBindings>;
}): Dockerode.ContainerCreateOptions => ({
    name: containerName,
    Image: DOCKER_IMAGE_TAG,
    Cmd: Option.getOrUndefined(command),
    Volumes: { "/android/avd-home/Pixel2.avd/": {} },
    Env: environmentVariables.some((x) => x.startsWith("DISPLAY="))
        ? environmentVariables
        : ["DISPLAY=:1", ...environmentVariables],
    HostConfig: {
        NetworkMode: Option.getOrElse(networkMode, () => "host"),
        DeviceRequests: [{ Count: -1, Driver: "nvidia", Capabilities: [["gpu"]] }],
        Devices: [{ CgroupPermissions: "mrw", PathInContainer: "/dev/kvm", PathOnHost: "/dev/kvm" }],
        PortBindings: Object.fromEntries(
            Object.entries(portBindings).map(([key, value]) => [key, value.map((x) => ({ HostPort: `${x.HostPort}` }))])
        ),
        Binds: [
            "/tmp/.X11-unix:/tmp/.X11-unix",
            "/etc/timezone:/etc/timezone:ro",
            "/etc/localtime:/etc/localtime:ro",
            `${SHARED_EMULATOR_DATA_VOLUME_NAME}:/android/avd-home/Pixel2.avd/`,
        ],
    },
});

export default containerCreateOptions;

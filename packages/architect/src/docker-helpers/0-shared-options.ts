import Dockerode from "dockerode";

import { DOCKER_IMAGE_TAG, SHARED_EMULATOR_DATA_VOLUME_NAME } from "../versions.js";

/** The port bindings that all architect emulator containers must have. */
export interface IArchitectPortBindings {
    /** Adb console port */
    "5554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Adb port */
    "5555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Mitmproxy web interface port */
    "8080/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Envoy proxy admin web interface port */
    "8081/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Emulator grpc port */
    "8554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Emulator grpc web port */
    "8555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];

    /** Frida server port */
    "27042/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
}

/**
 * Specifies the docker options for creating an architect container. You must
 * provide a name for the container and you can optionally provide the
 * entrypoint command, abort signal, network mode, port bindings, and
 * environment variables.
 */
export const containerCreateOptions = ({
    containerName,
    command,
    abortSignal,
    networkMode,
    portBindings,
    environmentVariables,
}: {
    containerName: string;
    command?: string[] | undefined;
    abortSignal?: AbortSignal | undefined;
    networkMode?: string | undefined;
    environmentVariables?: string[] | undefined;
    portBindings?: IArchitectPortBindings | undefined;
}): Dockerode.ContainerCreateOptions => ({
    ...(abortSignal ? { abortSignal } : {}),
    name: containerName,
    Cmd: command,
    Image: DOCKER_IMAGE_TAG,
    Env: environmentVariables,
    Volumes: { "/android/avd-home/Pixel2.avd/": {} },
    HostConfig: {
        PortBindings: portBindings,
        NetworkMode: networkMode || "host",
        DeviceRequests: [{ Count: -1, Driver: "nvidia", Capabilities: [["gpu"]] }],
        Devices: [{ CgroupPermissions: "mrw", PathInContainer: "/dev/kvm", PathOnHost: "/dev/kvm" }],
        Binds: [
            "/tmp/.X11-unix:/tmp/.X11-unix",
            "/etc/timezone:/etc/timezone:ro",
            "/etc/localtime:/etc/localtime:ro",
            `${SHARED_EMULATOR_DATA_VOLUME_NAME}:/android/avd-home/Pixel2.avd/`,
        ],
    },
});

export default containerCreateOptions;

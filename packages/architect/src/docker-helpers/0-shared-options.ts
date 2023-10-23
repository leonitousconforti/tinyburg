import Dockerode from "dockerode";

import { DOCKER_IMAGE_TAG } from "../versions.js";
import { SHARED_EMULATOR_DATA_VOLUME_NAME } from "../constants.js";

/** The port bindings that all architect emulator containers must have. */
export interface IArchitectPortBindings {
    "5554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "5555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8081/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
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
        NetworkMode: networkMode || "host",
        PortBindings: portBindings,
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

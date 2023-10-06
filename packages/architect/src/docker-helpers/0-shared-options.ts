import Dockerode from "dockerode";

import { DOCKER_IMAGE_TAG } from "../versions.js";

/** The port bindings that all architect emulator containers must have. */
export interface IArchitectPortBindings {
    "5554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "5555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8081/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8554/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "8555/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
    "27042/tcp": [Omit<Dockerode.PortBinding, "HostPort"> & { HostPort: string }];
}

export const containerCreateOptions = ({
    containerName,
    command,
    portBindings,
}: {
    containerName: string;
    command?: string[] | undefined;
    portBindings?: IArchitectPortBindings | undefined;
}): Dockerode.ContainerCreateOptions => ({
    name: containerName,
    Cmd: command,
    Image: DOCKER_IMAGE_TAG,
    Volumes: { "/android/avd-home/Pixel2.avd/": {} },
    HostConfig: {
        PortBindings: portBindings,
        Binds: ["architect_emulator_data:/android/avd-home/Pixel2.avd/"],
        DeviceRequests: [{ Count: -1, Driver: "nvidia", Capabilities: [["gpu"]] }],
        Devices: [{ CgroupPermissions: "mrw", PathInContainer: "/dev/kvm", PathOnHost: "/dev/kvm" }],
    },
});

export default containerCreateOptions;

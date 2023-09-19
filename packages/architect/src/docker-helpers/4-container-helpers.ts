import type { IArchitectPortBindings } from "./0-shared-options.js";

import tar from "tar-fs";
import Debug from "debug";
import path from "node:path";
import Dockerode from "dockerode";
import DockerModem from "docker-modem";
import { runCommandBlocking, installApkCommand } from "../adb-commands.js";
import {
    apkInstallFailed,
    containerDiedPrematurely,
    timedOutWhileWaitingForContainerToBecomeHealthy,
} from "../errors.js";

/** The endpoints that can be generated from the port bindings. */
export interface IArchitectEndpoints {
    emulatorContainerHost: string;
    adbConsoleAddress: string;
    adbAddress: string;
    grpcAddress: string;
    fridaAddress: string;
    envoyGrpcWebAddress: string;
    envoyAdminAddress: string;
}

export const installApk = async ({
    apk,
    logger,
    container,
}: {
    apk: string;
    logger: Debug.Debugger;
    container: Dockerode.Container;
}): Promise<void> => {
    logger('Installing apk="%s"', apk);
    const start = performance.now();
    const tarball = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
    await container.putArchive(tarball, { path: "/android/apks/" });
    const command = installApkCommand(`/android/apks/${path.basename(apk)}`) as unknown as string[];
    const output = await runCommandBlocking({ container, command });
    const end = performance.now();
    logger("Apk install took %ss", ((end - start) / 1000).toFixed(2));
    if (!output.includes("Success")) throw apkInstallFailed(container.id);
};

export const getExposedEmulatorEndpoints = async ({
    dockerode,
    logger,
    emulatorContainer,
}: {
    dockerode: Dockerode;
    logger: Debug.Debugger;
    emulatorContainer: Dockerode.Container;
}): Promise<IArchitectEndpoints> => {
    const inspectResults = await emulatorContainer.inspect();
    const containerPortBindings = inspectResults.NetworkSettings.Ports as unknown as IArchitectPortBindings;
    const emulatorContainerHost = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    const endpoints = {
        emulatorContainerHost,
        adbConsoleAddress: `${emulatorContainerHost}:${containerPortBindings["5554/tcp"][0].HostPort}`,
        adbAddress: `${emulatorContainerHost}:${containerPortBindings["5555/tcp"][0].HostPort}`,
        envoyAdminAddress: `http://${emulatorContainerHost}:${containerPortBindings["8081/tcp"][0].HostPort}`,
        grpcAddress: `${emulatorContainerHost}:${containerPortBindings["8554/tcp"][0].HostPort}`,
        envoyGrpcWebAddress: `http://${emulatorContainerHost}:${containerPortBindings["8555/tcp"][0].HostPort}`,
        fridaAddress: `${emulatorContainerHost}:${containerPortBindings["27042/tcp"][0].HostPort}`,
    };
    logger("Container endpoints are: %o", endpoints);
    return endpoints;
};

export const isContainerHealthy = async ({
    logger,
    container,
}: {
    logger: Debug.Debugger;
    container: Dockerode.Container;
}): Promise<boolean> => {
    const containerInspect = await container.inspect();
    logger("Waiting for container to report it is healthy, status=%s", containerInspect.State.Health?.Status);
    if (!containerInspect.State.Running) throw containerDiedPrematurely(containerInspect.Name);
    if (containerInspect.State.Health?.Status === "unhealthy")
        throw timedOutWhileWaitingForContainerToBecomeHealthy(containerInspect.Name);
    return containerInspect.State.Health?.Status === "healthy";
};

export default { getExposedEmulatorEndpoints, isContainerHealthy, installApk };

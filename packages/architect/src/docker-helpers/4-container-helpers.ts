import type { IArchitectPortBindings } from "./0-shared-options.js";

import tar from "tar-fs";
import Debug from "debug";
import path from "node:path";
import Dockerode from "dockerode";
import DockerModem from "docker-modem";

import {
    apkInstallFailed,
    containerDiedPrematurely,
    timedOutWhileWaitingForContainerToBecomeHealthy,
} from "../errors.js";
import { runCommandBlocking, installApkCommand } from "../adb-commands.js";

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

/** Installs an apk into an architect container. */
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
    const start: number = performance.now();
    const tarball: tar.Pack = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
    await container.putArchive(tarball, { path: "/android/apks/" });
    const command: string[] = installApkCommand(`/android/apks/${path.basename(apk)}`) as unknown as string[];
    const output: string = await runCommandBlocking({ container, command });
    const end: number = performance.now();
    logger("Apk install took %ss", ((end - start) / 1000).toFixed(2));
    if (!output.includes("Success")) throw new Error(apkInstallFailed(container.id));
};

/**
 * Retrieves all the endpoints exposed by the container. If the endpoints are
 * meant to be consumed in a browser, they will be prefixed with "http" or
 * "https" appropriately. Application endpoints will have no prefix.
 */
export const getExposedEmulatorEndpoints = async ({
    dockerode,
    emulatorContainer,
}: {
    dockerode: Dockerode;
    emulatorContainer: Dockerode.Container;
}): Promise<IArchitectEndpoints> => {
    const inspectResults: Dockerode.ContainerInspectInfo = await emulatorContainer.inspect();
    const emulatorContainerHost: string = (dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
    const containerPortBindings: IArchitectPortBindings = inspectResults.NetworkSettings
        .Ports as unknown as IArchitectPortBindings;

    return inspectResults.HostConfig.NetworkMode === "host"
        ? {
              emulatorContainerHost,
              adbConsoleAddress: `${emulatorContainerHost}:5554`,
              adbAddress: `${emulatorContainerHost}:5555`,
              envoyAdminAddress: `http://${emulatorContainerHost}:8081`,
              grpcAddress: `${emulatorContainerHost}:8554`,
              envoyGrpcWebAddress: `http://${emulatorContainerHost}:8555`,
              fridaAddress: `${emulatorContainerHost}:27042`,
          }
        : {
              emulatorContainerHost,
              adbConsoleAddress: `${emulatorContainerHost}:${containerPortBindings["5554/tcp"]?.[0].HostPort}`,
              adbAddress: `${emulatorContainerHost}:${containerPortBindings["5555/tcp"]?.[0].HostPort}`,
              envoyAdminAddress: `http://${emulatorContainerHost}:${containerPortBindings["8081/tcp"]?.[0].HostPort}`,
              grpcAddress: `${emulatorContainerHost}:${containerPortBindings["8554/tcp"]?.[0].HostPort}`,
              envoyGrpcWebAddress: `http://${emulatorContainerHost}:${containerPortBindings["8555/tcp"]?.[0].HostPort}`,
              fridaAddress: `${emulatorContainerHost}:${containerPortBindings["27042/tcp"]?.[0].HostPort}`,
          };
};

/** Determines if a container is healthy or not by polling its status. */
export const isContainerHealthy = async ({
    logger,
    container,
}: {
    logger: Debug.Debugger;
    container: Dockerode.Container;
}): Promise<boolean> => {
    const containerInspect: Dockerode.ContainerInspectInfo = await container.inspect();
    logger("Waiting for container to report it is healthy, status=%s", containerInspect.State.Health?.Status);
    if (!containerInspect.State.Running) throw new Error(containerDiedPrematurely(containerInspect.Name));
    if (containerInspect.State.Health?.Status === "unhealthy")
        throw new Error(timedOutWhileWaitingForContainerToBecomeHealthy(containerInspect.Name));
    return containerInspect.State.Health?.Status === "healthy";
};

export default { getExposedEmulatorEndpoints, isContainerHealthy, installApk };

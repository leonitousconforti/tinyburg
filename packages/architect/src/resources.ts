import type DockerModem from "docker-modem";
import type { DockerConnectionOptions } from "./index.js";

import fs from "node:fs";
import tar from "tar-fs";
import frida from "frida";
import path from "node:path";
import assert from "node:assert";
import Dockerode from "dockerode";

/**
 * Wrapper around the dockerode container class that stores multiple containers.
 * When architect starts multiple services that are all part of the same stack,
 * they can all be captured in this class. This allows the user to stop and
 * destroy all the resources that were allocated at once.
 */
export class ArchitectEmulatorServices {
    private _dockerode: Dockerode;
    private _emulatorContainer: Dockerode.Container;
    private _otherContainers: Array<Dockerode.Container>;

    public constructor(
        dockerode: Dockerode,
        emulatorContainer: Dockerode.Container,
        otherContainers: Array<Dockerode.Container> = []
    ) {
        this._dockerode = dockerode;
        this._emulatorContainer = emulatorContainer;
        this._otherContainers = otherContainers;
    }

    public getEmulatorContainer(): Dockerode.Container {
        return this._emulatorContainer;
    }

    public getContainers(): Dockerode.Container[] {
        return [this._emulatorContainer, ...this._otherContainers];
    }

    public async stop(): Promise<void> {
        await Promise.all(this.getContainers().map((container) => container.stop()));
    }

    public async remove(): Promise<void> {
        await Promise.all(this.getContainers().map((container) => container.remove()));
    }

    /**
     * Get the addresses that are exposed by the container using port bindings
     * provided when starting the container.
     */
    public getExposedEmulatorEndpoints = async (): Promise<{
        containerHost: string;
        adbConsoleAddress: string;
        adbAddress: string;
        grpcAddress: string;
        fridaAddress: string;
    }> => {
        const containerHost = (this._dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
        const inspectResults = await this._emulatorContainer.inspect();
        const containerPortBindings = inspectResults.NetworkSettings.Ports;
        const adbConsoleAddress = `${containerHost}:${containerPortBindings["5554/tcp"]![0]?.HostPort}`;
        const adbAddress = `${containerHost}:${containerPortBindings["5555/tcp"]![0]?.HostPort}`;
        const grpcAddress = `${containerHost}:${containerPortBindings["8554/tcp"]![0]?.HostPort}`;
        const fridaAddress = `${containerHost}:${containerPortBindings["27042/tcp"]![0]?.HostPort}`;
        return { containerHost, adbConsoleAddress, adbAddress, grpcAddress, fridaAddress };
    };

    /**
     * Waits for the emulator container's health check to report that the
     * container has entered a healthy state. Will throw early if the container
     * ever dies prematurely but will keep retrying if the container just
     * reports as unhealthy.
     *
     * @param retries - The maximum number of tries before giving up
     * @param waitMs - The number of milliseconds to wait between retries
     */
    public waitForContainerToBeHealthy = async (retries: number = 60, waitMs: number = 3000): Promise<void> => {
        const inspectResult = await this._emulatorContainer.inspect();
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
                return await this.waitForContainerToBeHealthy(retries - 1, waitMs);
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
    public waitForFridaToBeReachable = async (
        fridaAddress: string,
        retries: number = 60,
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
                return await this.waitForFridaToBeReachable(fridaAddress, retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error instanceof Error ? error : new Error(error as string | undefined);
        }
    };

    public waitForCpuToBeIdle = async (cpuThreshold = 3, retries = 60, waitMs = 3000): Promise<void> => {
        try {
            const statsResult = await this._emulatorContainer.stats({ stream: false });
            const currentCpuStats = statsResult.cpu_stats;
            const previousCpuStats = statsResult.precpu_stats;
            const cpuDelta = currentCpuStats.cpu_usage.total_usage - previousCpuStats.cpu_usage.total_usage;
            const systemDelta = currentCpuStats.system_cpu_usage - previousCpuStats.system_cpu_usage;
            const cpuUsage = (cpuDelta / systemDelta) * 100;
            if (cpuUsage && cpuUsage >= cpuThreshold) throw new Error(`CPU is not idle, usage=${cpuUsage}`);
        } catch (error: unknown) {
            // If there are retries remaining, wait for the desired timeout and then recurse
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return await this.waitForCpuToBeIdle(cpuThreshold, retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error;
        }
    };

    public waitForTinyTowerToBeSpawnable = async (
        fridaAddress: string,
        retries: number = 60,
        waitMs: number = 3000
    ): Promise<void> => {
        const testScript = `
            rpc.exports = {
                main: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    return "Hi, mom!";
                },
            };
        `;

        try {
            const deviceManager = frida.getDeviceManager();
            const device = await deviceManager.addRemoteDevice(fridaAddress);
            const applications = await device.enumerateApplications();
            assert(applications.some((application) => application.identifier === "com.nimblebit.tinytower"));

            const pid = await device.spawn("com.nimblebit.tinytower");
            const session = await device.attach(pid);
            const script = await session.createScript(testScript);

            await script.load();
            await device.resume(pid);
            const result = await script.exports["main"]?.();
            assert(result === "Hi, mom!");

            await script.unload();
            await session.detach();
            await device.kill(pid);
        } catch (error: unknown) {
            // Remove the remote device on error because it might be in a bad state
            const deviceManager = frida.getDeviceManager();
            await deviceManager.removeRemoteDevice(fridaAddress);

            // If there are retries remaining, wait for the desired timeout and then recurse
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return await this.waitForTinyTowerToBeSpawnable(fridaAddress, retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error;
        }
    };

    /**
     * Given the path to an apk, will install it into the emulator container.
     * Will replace the existing application (if present), will downgrade the
     * version (if supplied a lower version of the application), allows tests
     * packages and will grant all runtime permissions by default.
     *
     * @see https://developer.android.com/tools/adb
     */
    public installApk = async (apk: string): Promise<void> => {
        const tarball = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
        await this._emulatorContainer.putArchive(tarball, { path: "/android/apks/" });
        const exec = await this._emulatorContainer.exec({
            AttachStderr: true,
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
        const execStream = await exec.start({});
        await new Promise<void>((resolve, reject) => {
            this._dockerode.modem.followProgress(execStream, (error) => (error ? reject(error) : resolve()));
        });
        const { fridaAddress } = await this.getExposedEmulatorEndpoints();
        await this.waitForTinyTowerToBeSpawnable(fridaAddress);
    };

    public startFridaServer = async (): Promise<void> => {
        const exec = await this._emulatorContainer.exec({
            Cmd: ["/android/sdk/install-frida-server.sh"],
        });
        await exec.start({ Detach: true });
    };

    /**
     * Will launch the Launcher intent of the com.nimblebit.tinytower
     * application in the emulator. Does not wait/block for the application to
     * load before returning.
     *
     * @see https://stackoverflow.com/questions/4567904/how-to-start-an-application-using-android-adb-tools
     */
    public launchGame = async (): Promise<void> => {
        const exec = await this._emulatorContainer.exec({
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
        await exec.start({ Detach: true });
    };
}

/**
 * When a named docker volume is deleted, all the data in that volume is deleted
 * as well which saves on storage space. However, when a bind mount/bind volume
 * is deleted, the data on the host is not deleted with it - and for good
 * reasons! However, this means that we need to manually delete the data on the
 * docker host, which is not ideal if I want to be running lots of containers on
 * the same host. This class is a wrapper around the dockerode volume class that
 * will delete the data on the host when the bind volume is deleted.
 */
export class ArchitectDataVolume {
    private _dockerode: Dockerode;
    private _volume: Dockerode.Volume;

    private constructor(dockerode: Dockerode, volume: Dockerode.Volume) {
        this._volume = volume;
        this._dockerode = dockerode;
    }

    public static createFromExisting(dockerode: Dockerode, volume: Dockerode.Volume): ArchitectDataVolume {
        return new this(dockerode, volume);
    }

    public static async createNew(
        dockerode: Dockerode,
        containerName: string,
        architectDataDirectory?: fs.PathLike
    ): Promise<ArchitectDataVolume> {
        if (architectDataDirectory) {
            const hostPathCreationHelperContainer = await dockerode.createContainer({
                Image: "alpine",
                Cmd: ["echo"],
                HostConfig: {
                    AutoRemove: true,
                    Binds: [`${path.join(architectDataDirectory.toString(), `${containerName}_emulator_data`)}:/tmp`],
                },
            });
            await hostPathCreationHelperContainer.start();
        }

        const createVolume = dockerode.createVolume({
            Name: `${containerName}_emulator_data`,
            Driver: "local",
            DriverOpts: architectDataDirectory
                ? {
                      o: "bind",
                      type: "none",
                      device: path.join(architectDataDirectory.toString(), `${containerName}_emulator_data`),
                  }
                : { type: "none" },
        }) as Promise<unknown> as Promise<Dockerode.Volume>;

        return new this(dockerode, await createVolume);
    }

    public async inspect(): Promise<Dockerode.VolumeInspectInfo> {
        return this._volume.inspect();
    }

    public async remove(): Promise<void> {
        const inspectResult = await this._volume.inspect();
        const containerName = inspectResult?.Name!;
        const architectDataDirectory = inspectResult?.Options?.["device"]?.replace(containerName, "");

        if (inspectResult?.Options?.["o"] === "bind") {
            const hostPathDeletionContainerHelper = await this._dockerode.createContainer({
                Image: "alpine",
                Cmd: ["rm", "-r", `/architect/${containerName}`],

                HostConfig: {
                    AutoRemove: true,
                    Binds: [`${architectDataDirectory}:/architect`],
                },
            });
            await hostPathDeletionContainerHelper.start();
        }

        await this._volume.remove();
        return;
    }
}

/**
 * Removes all running and stopped architect containers and networks from the
 * docker host.
 */
export const cleanUpAllArchitectResources = async (
    dockerConnectionOptions?: DockerConnectionOptions,
    removeStopped: boolean = true
): Promise<void> => {
    const dockerode: Dockerode = new Dockerode(
        Object.assign({ socketPath: "/var/run/docker.sock" }, dockerConnectionOptions || {})
    );

    const allNetworks = await dockerode.listNetworks({ all: removeStopped });
    const allContainers = await dockerode.listContainers({ all: removeStopped });

    const containerFilter = (container: Dockerode.ContainerInfo): boolean =>
        container.Image.startsWith("ghcr.io/leonitousconforti/tinyburg/architect_") ||
        container.Names.some((name) => name.includes("architect-"));

    const allArchitectNetworks = allNetworks
        .filter((network) => network.Name.includes("architect"))
        .map((network) => dockerode.getNetwork(network.Id));
    const allArchitectContainers = allContainers
        .filter((container) => containerFilter(container))
        .map((container) => dockerode.getContainer(container.Id));
    const allRunningArchitectContainers = allContainers
        .filter((container) => containerFilter(container))
        .filter((container) => container.State === "running")
        .map((container) => dockerode.getContainer(container.Id));

    await Promise.all(allRunningArchitectContainers.map((container) => container.stop()));
    await Promise.all(allArchitectContainers.map((container) => container.remove()));
    await Promise.all(allArchitectNetworks.map((network) => network.remove()));
};

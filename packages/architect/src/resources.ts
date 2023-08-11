import type DockerModem from "docker-modem";

import path from "node:path";
import assert from "node:assert";

import tar from "tar-fs";
import frida from "frida";
import Debug from "debug";
import Dockerode from "dockerode";

export type ArchitectResource =
    | Dockerode.Container
    | Dockerode.Volume
    | Dockerode.Network
    | Dockerode.Image
    | Dockerode.Secret;

/**
 * Wrapper around the dockerode container class that stores multiple containers.
 * When architect starts multiple services that are all part of the same stack,
 * they can all be captured in this class. This allows the user to stop and
 * destroy all the resources that were allocated at once.
 */
export class ArchitectServices {
    private _logger: Debug.Debugger;
    private _dockerode: Dockerode;
    private _emulatorContainer: Dockerode.Container;
    private _otherResources: Array<ArchitectResource>;

    public constructor(
        dockerode: Dockerode,
        serviceName: string,
        emulatorContainer: Dockerode.Container,
        otherResources: Array<ArchitectResource> = []
    ) {
        this._dockerode = dockerode;
        this._emulatorContainer = emulatorContainer;
        this._otherResources = otherResources;
        this._logger = Debug(`tinyburg:architect:emulator-${serviceName}`);
    }

    public getEmulatorContainer(): Dockerode.Container {
        return this._emulatorContainer;
    }

    public getResources(): ArchitectResource[] {
        return [this._emulatorContainer, ...this._otherResources];
    }

    public getContainerResources(): Dockerode.Container[] {
        return this.getResources().filter(
            (resource) => resource instanceof Dockerode.Container
        ) as Dockerode.Container[];
    }

    public getNonContainerResources(): (Dockerode.Volume | Dockerode.Network | Dockerode.Image | Dockerode.Secret)[] {
        return this.getResources().filter((resource) => !(resource instanceof Dockerode.Container)) as (
            | Dockerode.Volume
            | Dockerode.Network
            | Dockerode.Image
            | Dockerode.Secret
        )[];
    }

    public async stopAll(): Promise<void> {
        await Promise.all(this.getContainerResources().map((container) => container.stop()));
    }

    public async removeAll(): Promise<void> {
        await Promise.all(this.getContainerResources().map((container) => container.remove()));
        await Promise.all(this.getNonContainerResources().map((resource) => resource.remove()));
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
        const inspectResults = await this._emulatorContainer.inspect();
        const containerPortBindings = inspectResults.NetworkSettings.Ports;
        const containerHost = (this._dockerode.modem as DockerModem.ConstructorOptions).host || "localhost";
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
    public waitForContainerToBeHealthy = async (retries: number = 20, waitMs: number = 3000): Promise<void> => {
        this._logger("Waiting for container to be healthy");
        const inspectResult = await this._emulatorContainer.inspect();
        if (inspectResult.State.Status === "exited") throw new Error("Container exited prematurely");

        // Wrap this in a try-catch because we don't want errors to bubble up
        // because there might be the opportunity to recover from these.
        try {
            if (inspectResult.State.Health?.Status !== "healthy") {
                throw new Error(`Container is not healthy, status=${inspectResult.State.Health?.Status}`);
            }
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
     * @param retries - The maximum number of tries before giving up
     * @param waitMs - The number of milliseconds to wait between retries
     */
    public waitForFridaToBeReachable = async (retries: number = 10, waitMs: number = 3000): Promise<void> => {
        this._logger("Waiting for frida server to be reachable");
        const { fridaAddress } = await this.getExposedEmulatorEndpoints();

        // Wrap this in a try-catch because we don't want errors to bubble up
        // because there might be the opportunity to recover from these
        try {
            const deviceManager = frida.getDeviceManager();
            const device = await deviceManager.addRemoteDevice(fridaAddress);
            const processes = await device.enumerateApplications({
                identifiers: ["com.nimblebit.tinytower"],
                scope: frida.Scope.Minimal,
            });
            if (!processes) throw new Error("Frida server is not reachable");
        } catch (error: unknown) {
            // Remove the remote device on error because it might be in a bad state
            const deviceManager = frida.getDeviceManager();
            await deviceManager.removeRemoteDevice(fridaAddress);

            // If there are retries remaining, wait for the desired timeout and then recurse
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return await this.waitForFridaToBeReachable(retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error;
        }
    };

    public waitForTinyTowerToBeSpawnable = async (retries: number = 10, waitMs: number = 3000): Promise<void> => {
        this._logger("Waiting for Tiny Tower to be spawnable");

        const { fridaAddress } = await this.getExposedEmulatorEndpoints();
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
            const applications = await device.enumerateApplications({
                identifiers: ["com.nimblebit.tinytower"],
                scope: frida.Scope.Minimal,
            });
            assert(applications.some((application) => application.identifier === "com.nimblebit.tinytower"));

            const pid = await device.spawn("com.nimblebit.tinytower");
            const session = await device.attach(pid);
            const script = await session.createScript(testScript);

            await script.load();
            await device.resume(pid);
            // eslint-disable-next-line dot-notation
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
                return await this.waitForTinyTowerToBeSpawnable(retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error;
        }
    };

    public startFridaServer = async (retries: number = 10, waitMs: number = 3000): Promise<void> => {
        this._logger("Starting frida server");

        try {
            const exec = await this._emulatorContainer.exec({
                AttachStdout: true,
                AttachStderr: true,
                Cmd: ["/android/sdk/install-frida-server.sh"],
            });
            const execStream = await exec.start({});

            const result = await new Promise<string>((resolve, reject) => {
                const data: string[] = [];
                execStream.on("data", (chunk: Buffer) => {
                    data.push(chunk.toString());
                    if (data.join("").includes("27043")) {
                        execStream.removeAllListeners("data");
                        execStream.removeAllListeners("end");
                        execStream.removeAllListeners("error");
                        resolve(data.join(""));
                    }
                });
                execStream.on("end", () => resolve(data.join("")));
                execStream.on("error", (error) => reject(error));
            });

            if (result.includes("Cannot read properties of null (reading 'queryIntentActivities')")) {
                throw new Error("Frida server failed to start: queryIntentActivities bug");
            } else if (result.includes("adb: device offline")) {
                throw new Error("Frida server failed to start: device offline");
            } else if (result.includes("error: closed")) {
                throw new Error("Frida server failed to start: closed");
            }
        } catch (error: unknown) {
            console.log(error);
            // If there are retries remaining, wait for the desired timeout and then recurse
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return await this.startFridaServer(retries - 1, waitMs);
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
        this._logger(`Installing apk=${apk}`);
        const tarball = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
        await this._emulatorContainer.putArchive(tarball, { path: "/android/apks/" });
        const exec = await this._emulatorContainer.exec({
            AttachStderr: true,
            AttachStdout: true,
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
            execStream.on("data", () => resolve());
            execStream.on("error", (error) => reject(error));
            execStream.on("end", () => resolve());
            execStream.on("close", () => resolve());
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.waitForTinyTowerToBeSpawnable();
    };

    /**
     * Will launch the Launcher intent of the com.nimblebit.tinytower
     * application in the emulator. Does not wait/block for the application to
     * load before returning.
     *
     * @see https://stackoverflow.com/questions/4567904/how-to-start-an-application-using-android-adb-tools
     */
    public launchGame = async (): Promise<void> => {
        this._logger("Launching TinyTower");
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

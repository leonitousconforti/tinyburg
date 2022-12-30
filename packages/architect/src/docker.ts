import "dockerode";

import { Emulator } from "./emulator.js";

/**
 * An emulator instance that is contained within a docker container. Can only be
 * deployed on linux hosts and they must have kvm acceleration available.
 * Additionally, gpu acceleration can be added if the system has an nvidia gpu
 * and the required docker plugins are included.
 */
export class DockerEmulator extends Emulator {
    private _gpu: string | undefined;
    private readonly _address: string;

    /**
     * Creates a new android emulator docker instance and attempts to connect to
     * the docker host.
     *
     * @param name - The name for this docker container
     * @param address - The address of the docker host to use, can be either a
     *   unix socket, an ssh connection, or the address of an exposed docker
     *   daemon.
     */
    public constructor(name: string, address: string) {
        super(name);
        this._address = address;
        this._gpu = undefined;
    }

    public getAddress(): string {
        return this._address;
    }

    public useGpu(gpu: string): void {
        this._gpu = gpu;
    }

    /**
     * Builds a new docker container using the remote system's docker engine.
     * The android emulator docker image will not be pushed to any registry but
     * will remain on the remote system until it is destroyed.
     */
    public create(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * Starts the android emulator docker container. If a gpu has been specified
     * with the useGpu method, then gou acceleration will be added to the docker
     * container when it is started.
     */
    public up(): Promise<{
        processPid: number;
        fridaServerAddress: string;
        emulatorGrpcControlAddress: string;
        emulatorAdbAddress: string;
    }> {
        throw new Error("Method not implemented.");
    }

    /**
     * Stops the android emulator docker container. The container will remain
     * available on the system and can be resumed at anytime by calling the up
     * command again.
     */
    public down(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * Destroys the android emulator docker container and any data associated
     * with it. You will need to call create again after this command.
     */
    public destroy(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * Determines if this particular android emulator's docker container is
     * currently started or stopped.
     */
    public isRunning(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}

import frida from "frida";
import Dockerode from "dockerode";
import architect from "./index.js";

// Timeout tests after 8 minutes and cleanup after 1 minute
const ARCHITECT_TEST_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_TEST_TIMEOUT_MS"] as string, 10) || 1000 * 60 * 8;
const ARCHITECT_CLEANUP_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_CLEANUP_TIMEOUT_MS"] as string, 10) || 60_000;

// Override the docker host environment variable just for these tests
process.env["DOCKER_HOST"] = process.env["ARCHITECT_DOCKER_HOST"] || process.env["DOCKER_HOST"];

describe("simple tests", () => {
    const dockerode: Dockerode = new Dockerode();

    const cleanUpArchitectArtifacts = async (): Promise<void> => {
        const allNetworks = await dockerode.listNetworks({ all: true });
        const allContainers = await dockerode.listContainers({ all: true });

        const allArchitectNetworks = allNetworks
            .filter((network) => network.Name.startsWith("ghcr.io/leonitousconforti/tinyburg/architect:emulator-"))
            .map((network) => dockerode.getNetwork(network.Id));
        const allArchitectContainers = allContainers
            .filter((container) => container.Image.startsWith("ghcr.io/leonitousconforti/tinyburg/architect:emulator-"))
            .map((container) => dockerode.getContainer(container.Id));
        const allRunningArchitectContainers = allContainers
            .filter((container) => container.Image.startsWith("ghcr.io/leonitousconforti/tinyburg/architect:emulator-"))
            .filter((container) => container.State === "running")
            .map((container) => dockerode.getContainer(container.Id));

        await Promise.all(allRunningArchitectContainers.map((container) => container.stop()));
        await Promise.all(allArchitectContainers.map((container) => container.remove()));
        await Promise.all(allArchitectNetworks.map((network) => network.remove()));
    };

    beforeAll(cleanUpArchitectArtifacts, ARCHITECT_CLEANUP_TIMEOUT_MS);
    afterEach(cleanUpArchitectArtifacts, ARCHITECT_CLEANUP_TIMEOUT_MS);

    it(
        "Should be able to create a container without additional services",
        async () => {
            const { emulatorContainer, fridaAddress } = await architect();
            const deviceManager = frida.getDeviceManager();
            const device = await deviceManager.addRemoteDevice(fridaAddress);
            const processes = await device.enumerateProcesses();
            expect(emulatorContainer.id).toBeDefined();
            expect(processes).toBeDefined();
            expect(processes.length).toBeGreaterThan(0);
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );

    it(
        "Should be able to create a container with additional services",
        async () => {
            const { emulatorContainer, fridaAddress } = await architect();
            const deviceManager = frida.getDeviceManager();
            const device = await deviceManager.addRemoteDevice(fridaAddress);
            const processes = await device.enumerateProcesses();
            expect(emulatorContainer.id).toBeDefined();
            expect(processes).toBeDefined();
            expect(processes.length).toBeGreaterThan(0);
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );

    it(
        "Should be able to create a container with different port bindings",
        async () => {
            const { emulatorContainer, fridaAddress, adbConsoleAddress, adbAddress, grpcAddress } = await architect({
                portBindings: {
                    "5554/tcp": [{ HostPort: "5556" }],
                    "5555/tcp": [{ HostPort: "5557" }],
                    "8554/tcp": [{ HostPort: "8555" }],
                    "27042/tcp": [{ HostPort: "27044" }],
                },
            });
            const deviceManager = frida.getDeviceManager();
            const device = await deviceManager.addRemoteDevice(fridaAddress);
            const processes = await device.enumerateProcesses();
            expect(emulatorContainer.id).toBeDefined();
            expect(adbAddress).toContain(":5557");
            expect(grpcAddress).toContain(":8555");
            expect(fridaAddress).toContain(":27044");
            expect(adbConsoleAddress).toContain(":5556");
            expect(processes).toBeDefined();
            expect(processes.length).toBeGreaterThan(0);
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

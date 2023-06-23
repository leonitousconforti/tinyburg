/* eslint-disable dot-notation */

import Dockerode from "dockerode";
import architect from "./index.js";

// Timeout tests after 10 minutes and cleanup after 1 minute
const ARCHITECT_TEST_TIMEOUT_MS = Number.parseInt(process.env["ARCHITECT_TEST_TIMEOUT_MS"] as string) || 1000 * 60 * 10;
const ARCHITECT_CLEANUP_TIMEOUT_MS = Number.parseInt(process.env["ARCHITECT_CLEANUP_TIMEOUT_MS"] as string) || 60_000;

// Override the docker host environment variable just for these tests
process.env["DOCKER_HOST"] = process.env["ARCHITECT_TEST_DOCKER_HOST"] || process.env["DOCKER_HOST"];

describe("simple tests", () => {
    const dockerode: Dockerode = new Dockerode();

    const cleanUpArchitectArtifacts = async (): Promise<void> => {
        const allImages = await dockerode.listImages({ all: true });
        const allNetworks = await dockerode.listNetworks({ all: true });
        const allContainers = await dockerode.listContainers({ all: true });

        const allArchitectImages = allImages
            .filter((image) => image.RepoTags?.[0]?.includes("architect"))
            .map((image) => dockerode.getImage(image.Id));
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
        await Promise.all(allArchitectImages.map((image) => image.remove()));
        await Promise.all(allArchitectNetworks.map((network) => network.remove()));
    };

    beforeAll(cleanUpArchitectArtifacts, ARCHITECT_CLEANUP_TIMEOUT_MS);
    afterEach(cleanUpArchitectArtifacts, ARCHITECT_CLEANUP_TIMEOUT_MS);

    it(
        "Should be able to create a container without additional services",
        async () => {
            const { container } = await architect({ withAdditionalServices: false });
            expect(container.id).toBeDefined();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );

    it(
        "Should be able to create a container with additional services",
        async () => {
            const { container } = await architect({ withAdditionalServices: false });
            expect(container.id).toBeDefined();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

import "dotenv/config";

import architect, { cleanUpAllArchitectArtifacts } from "./index.js";

// Timeout tests after 4 minutes and cleanup after 1 minute
const ARCHITECT_TEST_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_TEST_TIMEOUT_MS"] as string, 10) || 1000 * 60 * 4;
const ARCHITECT_CLEANUP_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_CLEANUP_TIMEOUT_MS"] as string, 10) || 60_000;

describe("simple tests", () => {
    // Yes these do actually need to be async functions and use await
    beforeAll(async () => await cleanUpAllArchitectArtifacts(), ARCHITECT_CLEANUP_TIMEOUT_MS);
    afterAll(async () => await cleanUpAllArchitectArtifacts(), ARCHITECT_CLEANUP_TIMEOUT_MS);

    it(
        "Should be able to create a container without additional services",
        async () => {
            const { emulatorContainer, emulatorDataVolume } = await architect();
            expect(emulatorContainer.id).toBeDefined();
            await emulatorContainer.stop();
            await emulatorContainer.remove();
            await emulatorDataVolume.remove();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );

    // it(
    //     "Should be able to create a container with additional services",
    //     async () => {
    //         const { emulatorContainer, emulatorDataVolume } = await architect({ withAdditionalServices: true });
    //         expect(emulatorContainer.id).toBeDefined();
    //         await emulatorContainer.stop();
    //         await emulatorContainer.remove();
    //         await emulatorDataVolume.remove();
    //     },
    //     ARCHITECT_TEST_TIMEOUT_MS
    // );
});

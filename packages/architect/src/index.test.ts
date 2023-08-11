import architect from "./index.js";
import { cleanUpAllArchitectResources } from "./resources.js";

// Timeout tests after 8 minutes and cleanup after 1 minute
const ARCHITECT_TEST_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_TEST_TIMEOUT_MS"] as string, 10) || 1000 * 60 * 8;
const ARCHITECT_CLEANUP_TIMEOUT_MS =
    Number.parseInt(process.env["ARCHITECT_CLEANUP_TIMEOUT_MS"] as string, 10) || 60_000;

describe("simple tests", () => {
    // Yes these do actually need to be async functions and use await
    beforeAll(async () => await cleanUpAllArchitectResources(), ARCHITECT_CLEANUP_TIMEOUT_MS);
    afterAll(async () => await cleanUpAllArchitectResources(), ARCHITECT_CLEANUP_TIMEOUT_MS);

    it(
        "Should be able to create a container without additional services",
        async () => {
            const { emulatorServices, emulatorDataVolume } = await architect();
            expect(emulatorServices.getEmulatorContainer().id).toBeDefined();
            await emulatorServices.stopAll();
            await emulatorServices.removeAll();
            await emulatorDataVolume.remove();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

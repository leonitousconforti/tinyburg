import architect from "./index.js";
import { cleanUpAllArchitectResources } from "./resources.js";

// Timeout tests after 8 minutes and cleanup after 1 minute
const ARCHITECT_CLEANUP_TIMEOUT_MS = 1000 * 60;
const ARCHITECT_TEST_TIMEOUT_MS = 1000 * 60 * 8;

describe("simple tests", () => {
    // Yes these do actually need to be async functions and use await
    beforeAll(async () => await cleanUpAllArchitectResources(), ARCHITECT_CLEANUP_TIMEOUT_MS);
    afterAll(async () => await cleanUpAllArchitectResources(), ARCHITECT_CLEANUP_TIMEOUT_MS);

    it(
        "Should be able to create a container without additional services",
        async () => {
            const { emulatorServices } = await architect();
            expect(emulatorServices.getEmulatorContainer().id).toBeDefined();
            await emulatorServices.stopAll();
            await emulatorServices.removeAll();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

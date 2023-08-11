import architect from "./index.js";

// Timeout tests after 8 minutes
const ARCHITECT_TEST_TIMEOUT_MS = 1000 * 60 * 8;

describe("simple tests", () => {
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

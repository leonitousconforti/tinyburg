import architect from "./index.js";

// Timeout tests after 8 minutes
const ARCHITECT_TEST_TIMEOUT_MS = 1000 * 60 * 8;

describe("simple tests", () => {
    it(
        "Should be able to create a container",
        async () => {
            const { emulatorContainer } = await architect();
            expect(emulatorContainer.id).toBeDefined();
            await emulatorContainer.stop();
            await emulatorContainer.remove();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

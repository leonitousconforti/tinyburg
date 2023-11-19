import apks from "@tinyburg/archive";

import architect from "../src/index.js";

// Timeout tests after 14 minutes
const ARCHITECT_TEST_TIMEOUT_MS = 1000 * 60 * 14;

describe("Architect tests", () => {
    it(
        "Should be able to create a container",
        async () => {
            const apk = await apks.loadApk(apks.Games.TinyTower, "latest version");
            const { emulatorContainer, installApk } = await architect();
            expect(emulatorContainer.id).toBeDefined();
            await installApk(apk);
            await emulatorContainer.stop();
            await emulatorContainer.remove();
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

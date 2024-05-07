import * as NodeContext from "@effect/platform-node/NodeContext";
import * as Effect from "effect/Effect";
import * as MobyApi from "the-moby-effect/Moby";
import * as architect from "../src/index.js";

// Timeout tests after 14 minutes
const ARCHITECT_TEST_TIMEOUT_MS = 1000 * 60 * 14;

describe("Architect tests", () => {
    it(
        "Should be able to create a single container",
        async () => {
            const { emulatorContainer, sharedVolume } = await architect
                .architect()
                .pipe(Effect.provide(MobyApi.fromDockerHostEnvironmentVariable))
                .pipe(Effect.runPromise);
            expect(emulatorContainer.Id).toBeDefined();
            expect(sharedVolume.Name).toBeDefined();
            await architect
                .cleanup({ emulatorContainer, sharedVolume })
                .pipe(Effect.provide(NodeContext.layer))
                .pipe(Effect.provide(MobyApi.fromDockerHostEnvironmentVariable))
                .pipe(Effect.runPromise);
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );

    // it(
    //     "Should be able to create multiple containers at the same time",
    //     async () => {
    //         const run1 = architect();
    //         await new Promise((resolve) => setTimeout(resolve, 3000));
    //         const run2 = architect();

    //         const { emulatorContainer: emulatorContainer1 } = await run1;
    //         expect(emulatorContainer1.id).toBeDefined();
    //         await emulatorContainer1.stop();
    //         await emulatorContainer1.remove();

    //         const { emulatorContainer: emulatorContainer2 } = await run2;
    //         expect(emulatorContainer2.id).toBeDefined();
    //         await emulatorContainer2.stop();
    //         await emulatorContainer2.remove();
    //     },
    //     ARCHITECT_TEST_TIMEOUT_MS
    // );

    it(
        "Should be able to create a single container (one last time just for good measure)",
        async () => {
            const { emulatorContainer, sharedVolume } = await architect
                .architect()
                .pipe(Effect.provide(MobyApi.fromDockerHostEnvironmentVariable))
                .pipe(Effect.runPromise);
            expect(emulatorContainer.Id).toBeDefined();
            expect(sharedVolume.Name).toBeDefined();
            await architect
                .cleanup({ emulatorContainer, sharedVolume })
                .pipe(Effect.provide(NodeContext.layer))
                .pipe(Effect.provide(MobyApi.fromDockerHostEnvironmentVariable))
                .pipe(Effect.runPromise);
        },
        ARCHITECT_TEST_TIMEOUT_MS
    );
});

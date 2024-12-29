import { describe, it } from "@effect/vitest";
import { Effect, Function, Layer } from "effect";
import { DockerEngine, MobyConnection } from "the-moby-effect";

const localDocker = Function.pipe(
    MobyConnection.connectionOptionsFromPlatformSystemSocketDefault,
    Effect.map(DockerEngine.layerNodeJS),
    Layer.unwrapEffect
);

describe("Dummy", () => {
    it("should pass", () => {
        // expect(False).toBe(true);
        // expect(True).toBe(false);
    });
});

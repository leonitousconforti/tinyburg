import { Data } from "effect";

export type { IArchitectPortBindings } from "./0-shared-options.js";
export type { IArchitectEndpoints } from "./4-exposed-container-endpoints.js";

export { containerCreateOptions } from "./0-shared-options.js";
export { buildImage } from "./1-build-image.js";
export { populateSharedDataVolume } from "./2-populate-emulator-data-volume.js";
export { buildFreshContainer } from "./3-create-emulator-container.js";
export { getExposedEmulatorEndpoints } from "./4-exposed-container-endpoints.js";
export { isContainerHealthy, installApk, runCommandBlocking } from "./5-container-helpers.js";

export class DockerError extends Data.TaggedError("Docker")<{ message: string }> {}

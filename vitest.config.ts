import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: ["packages/*/vitest.config.ts"],
        // tinytower-sdk's round trip tests follow a live player who keeps
        // posting new snapshots. A new one is recorded rather than failing the
        // run; a recorded one that decodes differently still fails.
        update: "new",
    },
});

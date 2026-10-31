import url from "node:url";

import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        setupFiles: [url.fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))],
        server: { deps: { inline: [/@effect\/vitest/] } },
        fakeTimers: {
            toFake: undefined,
        },
        sequence: {
            concurrent: true,
        },
        include: ["test/**/*.test.ts"],
        reporters: ["default", "hanging-process", ["junit", { outputFile: "./coverage/junit.xml" }]],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            reporter: ["cobertura", "text"],
            reportsDirectory: "coverage",
        },
    },
};

export default config;

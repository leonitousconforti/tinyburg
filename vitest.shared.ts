import type { ViteUserConfig } from "vitest/config";

import path from "node:path";
import aliases from "vite-tsconfig-paths";

const config: ViteUserConfig = {
    plugins: [aliases()],
    esbuild: {
        target: "es2020",
    },
    test: {
        setupFiles: [path.join(__dirname, "vitest.setup.ts")],
        fakeTimers: {
            toFake: undefined,
        },
        sequence: {
            concurrent: true,
        },
        include: ["test/**/*.test.ts"],
        reporters: ["default", "hanging-process", ["junit", { outputFile: "./coverage/junit.xml" }]],
        coverage: {
            all: true,
            provider: "v8",
            include: ["src/**/*.ts"],
            reporter: ["cobertura", "text"],
            reportsDirectory: "coverage",
        },
    },
};

export default config;

import * as path from "node:path";
import type { ViteUserConfig } from "vitest/config";

const alias = (pkg: string, dir = pkg) => {
    const name = pkg === "tinyburg" ? "tinyburg" : `@tinyburg/${pkg}`;
    const target = process.env.TEST_DIST !== undefined ? "dist/dist/esm" : "src";
    return {
        [`${name}/test`]: path.join(__dirname, "packages", dir, "test"),
        [`${name}`]: path.join(__dirname, "packages", dir, target),
    };
};

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: ViteUserConfig = {
    esbuild: {
        target: "es2020",
    },
    optimizeDeps: {
        exclude: ["bun:sqlite"],
    },
    test: {
        setupFiles: [path.join(__dirname, "setupTests.ts")],
        fakeTimers: {
            toFake: undefined,
        },
        sequence: {
            concurrent: true,
        },
        include: ["test/**/*.test.ts"],
        alias: {
            ...alias("bitprints"),
            ...alias("doorman"),
            ...alias("explorer"),
            ...alias("fount"),
            ...alias("insight"),
            ...alias("nucleus"),
            ...alias("treasury"),
        },
    },
};

export default config;

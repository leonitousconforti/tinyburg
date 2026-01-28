// @ts-check

import fs from "node:fs";
import path from "node:path";

import node from "@astrojs/node";
import { defineConfig } from "astro/config";

/** @type {import("vite").PluginOption} */
const copyMigrationsPlugin = {
    name: "copy-migrations",
    apply: "build",
    async writeBundle(options) {
        const srcDir = path.resolve("./migrations");
        const destDir = path.join(options.dir ?? "", "migrations");
        if (fs.existsSync(srcDir)) {
            fs.cpSync(srcDir, destDir, { recursive: true });
        }
    },
};

// https://astro.build/config
export default defineConfig({
    output: "server",
    adapter: node({
        mode: "standalone",
    }),
    server: {
        allowedHosts: ["tinyburg.app", "www.tinyburg.app"],
    },
    vite: {
        plugins: [copyMigrationsPlugin],
    },
});

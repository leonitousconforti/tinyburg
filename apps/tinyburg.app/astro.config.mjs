// @ts-check

import fs from "node:fs";
import path from "node:path";

import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
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
    prefetch: true,
    output: "server",
    site: "https://tinyburg.app",
    integrations: [sitemap()],
    adapter: node({
        mode: "standalone",
    }),
    server: {
        allowedHosts: ["tinyburg.app", "www.tinyburg.app"],
    },
    vite: {
        // @ts-ignore
        plugins: [copyMigrationsPlugin, tailwindcss()],
    },
});

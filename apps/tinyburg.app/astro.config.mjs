// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    server: {
        allowedHosts: ["tinyburg.app", "www.tinyburg.app"],
    },
});

import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Build config only. There is no vite dev server: the Effect http server
// serves `dist/client` in development exactly as it does in production, so
// there is one origin, and no proxy table to keep in step with the routes the
// server owns.
export default defineConfig({
    root: "client",
    publicDir: "../public",
    build: {
        outDir: "../dist/client",
        emptyOutDir: true,
    },
    plugins: [tailwindcss(), foldkit()],
});

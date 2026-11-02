import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Build config only. There is no vite dev server: the Effect http server
// serves `dist/` in development exactly as it does in production, so there is
// one origin, and no proxy table to keep in step with the routes the server
// owns. One build writes the browser assets to `dist/client` and the server
// renderer to `dist/server/fetch.js`, sharing a build id so hydration can tell
// they belong together.
export default defineConfig({
    root: "client",
    publicDir: "../public",
    build: {
        emptyOutDir: true,
    },
    plugins: [
        tailwindcss(),
        foldkit({
            ssr: {
                serverEntry: "/entry.server.ts",
                clientEntry: "/entry.ts",
                build: { clientOutDir: "../dist/client", serverOutDir: "../dist/server" },
            },
        }),
    ],
});

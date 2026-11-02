import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// One build writes the browser assets to `dist/client` and the server renderer
// to `dist/server/fetch.js`, sharing a build id so hydration can tell they
// belong together. The Effect server serves both (routes/client.ts).
export default defineConfig({
    root: "client",
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

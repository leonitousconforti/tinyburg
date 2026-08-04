import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The client dev server proxies server-owned paths to the Effect http server
// (`pnpm start`). In production the server serves the built client itself.
export default defineConfig({
    root: "client",
    publicDir: "../public",
    build: {
        outDir: "../dist/client",
        emptyOutDir: true,
    },
    plugins: [tailwindcss(), foldkit()],
    optimizeDeps: { entries: ["entry.ts"] },
    server: {
        proxy: {
            "^/api/": "http://localhost:3000",
            "^/auth/": "http://localhost:3000",
            "^/logout$": "http://localhost:3000",
        },
    },
});

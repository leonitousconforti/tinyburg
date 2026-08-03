import { HttpStaticServer } from "effect/unstable/http";

import { fileURLToPath } from "node:url";

/**
 * Serves the built foldkit SPA. Real files under dist/client are served
 * directly; anything else (client-side routes like /towers/@me) falls back to
 * index.html so the SPA router can take over.
 */
export const StaticRoutesLive = HttpStaticServer.layer({
    root: fileURLToPath(new URL("../../dist/client", import.meta.url)),
    spa: true,
});

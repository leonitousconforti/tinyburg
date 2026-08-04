import { Effect, Layer, Path } from "effect";
import { HttpStaticServer } from "effect/unstable/http";

/**
 * Serves the built foldkit SPA. Real files under dist/client are served
 * directly; anything else (client-side routes like /towers/@me) falls back to
 * index.html so the SPA router can take over.
 */
export const StaticRoutesLive = Path.Path.pipe(
    Effect.flatMap((path) => path.fromFileUrl(new URL("../../dist/client", import.meta.url))),
    Effect.map((root) =>
        HttpStaticServer.layer({
            spa: true,
            root,
        })
    ),
    Layer.unwrap
);

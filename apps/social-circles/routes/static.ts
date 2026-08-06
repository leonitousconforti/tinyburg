import { Effect, Layer, Path } from "effect";
import { HttpStaticServer } from "effect/unstable/http";

/**
 * Serves the built dashboard. `spa: true` gives the index.html fallback for
 * client routes like /towers, while the study's own registered routes keep
 * winning over the fallback.
 */
export const StaticRoutesLive = Path.Path.pipe(
    Effect.flatMap((path) => path.fromFileUrl(new URL("../dist/client", import.meta.url))),
    Effect.map((root) => HttpStaticServer.layer({ spa: true, root })),
    Layer.unwrap
);

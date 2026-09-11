/**
 * Serves the stylesheet the server-rendered pages link to.
 *
 * The consent screen and the OIDC refusals are not SPA routes, so they cannot
 * use the built application stylesheet: it is emitted by Vite under a
 * content-hashed name and is far larger than those pages need. They link
 * `@tinyburg/shared-ui`'s standalone stylesheet instead, and this is what answers for
 * it.
 *
 * Cached, unlike the pages themselves. The file is the same for every visitor
 * and carries nothing about them, which is exactly what the pages linking it
 * cannot say.
 */

import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

import { STYLESHEET_HREF, stylesheetFile } from "@tinyburg/shared-ui/StandalonePage";

/**
 * @since 1.0.0
 * @category Layers
 */
export const StandaloneStylesheetLive = HttpRouter.add(
    "GET",
    STYLESHEET_HREF,
    HttpServerResponse.file(stylesheetFile.pathname, {
        headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" },
    }).pipe(Effect.orDie)
);

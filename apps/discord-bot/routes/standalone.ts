/**
 * Serves the stylesheet the `/link` callback page links to.
 *
 * The bot has no built frontend and no static file serving of its own - this
 * one file is the whole of what it needs to answer for, so it is a route
 * rather than a static server.
 *
 * Cached, unlike the callback page itself. The file is the same for every
 * visitor and carries nothing about them, which is exactly what the page
 * linking it cannot say.
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

import * as ServerRendering from "@tinyburg/shared-ui/ServerRendering";

import { siteUrl } from "../environment.ts";

/**
 * The foldkit app: built assets from dist/client, and every other GET (the
 * client-side routes, like /towers/@me) rendered on the server and hydrated
 * in the browser.
 */
export const ClientRoutesLive = ServerRendering.layer({
    dist: new URL("../../dist/", import.meta.url),
    origin: siteUrl,
});

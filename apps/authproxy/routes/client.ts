import { Config } from "effect";

import * as ServerRendering from "@tinyburg/shared-ui/ServerRendering";

import { redirectUri } from "./oauth.ts";

/**
 * The foldkit app: built assets from dist/client, and every other GET (the
 * client-side routes) rendered on the server and hydrated in the browser.
 *
 * The app is served from the origin tinyburg sends the sign in back to, so
 * that is the origin request urls are resolved against.
 */
export const ClientRoutesLive = ServerRendering.layer({
    dist: new URL("../dist/", import.meta.url),
    origin: Config.map(redirectUri, (uri) => new URL(uri).origin),
});

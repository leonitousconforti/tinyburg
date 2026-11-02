/**
 * Renders the page a request asks for, for the browser to hydrate.
 *
 * Built by `vite build` into `dist/server/fetch.js`, which the Effect server
 * calls for every GET that is not one of its own routes or a built asset
 * (`ServerRendering` in shared-ui). Only `init` and `view` run here: the
 * commands `init` returns, like the session check, run in the browser once it
 * takes over.
 */

import { Effect, Option } from "effect";

import { fromAcceptLanguage } from "@tinyburg/shared-ui/Internationalization";
import { Url } from "foldkit";
import * as Server from "foldkit/experimental/server";

import { Flags, init, routing, view } from "./main.ts";
import { urlToAppRoute } from "./routes.ts";

const head = `<meta name="description" content="An opt-in study of the TinyTower friend network. Sign in with Tinyburg to take part, see your circle, and delete your data whenever you like.">`;

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
    Server.renderDocument(application, assets, { head });

const isNotFound = (requestUrl: string): boolean =>
    Option.exists(Url.fromString(requestUrl), (url) => urlToAppRoute(url)._tag === "NotFound");

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
    Effect.runPromise(
        Effect.map(
            Server.renderToString(
                { Flags, routing, init, view },
                {
                    url: request.url,
                    flags: { language: fromAcceptLanguage(request.headers.get("accept-language") ?? undefined) },
                }
            ),
            (application) =>
                Server.Rendered(application, {
                    status: isNotFound(request.url) ? 404 : 200,
                    // Never kept: a page held across a deploy names a build the
                    // browser no longer has, and hydration refuses it.
                    headers: { "cache-control": "no-store", vary: "accept-language" },
                })
        )
    );

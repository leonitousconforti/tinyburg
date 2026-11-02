/**
 * Serves a foldkit application that renders on the server and hydrates in the
 * browser.
 *
 * `vite build` with the plugin's `ssr.build` writes two things: the browser
 * assets under `dist/client`, and `dist/server/fetch.js`, a Web fetch handler
 * whose server entry renders whichever page a request asks for. The Effect
 * server keeps the routes it already owns (its api, auth and OIDC endpoints)
 * and mounts this layer last: a GET for a real file under `dist/client` gets
 * the file, and every other GET gets a rendered page from the fetch handler.
 *
 * The handler is loaded on the first page request rather than when the server
 * starts, and loaded again whenever the file changes. In development
 * `scripts/vite-watch.mjs` rebuilds beside the running server, which can be up
 * before the first build lands, and every build replaces `fetch.js` with a new
 * file under a new build id. `node --watch` does not notice a replaced file
 * after the first time, so the server checks for itself. Each reload keeps the
 * previous module in memory, which only a long development session will see.
 *
 * Like `StandalonePage`, this is server code and is deliberately not
 * re-exported from the package index.
 *
 * @since 1.0.0
 */

import { type Config, Data, Effect, FileSystem, Layer, Option, Path, Predicate } from "effect";
import { HttpRouter, type HttpServerError, HttpServerRequest, HttpServerResponse, HttpStaticServer } from "effect/http";

import * as Server from "foldkit/experimental/server";

interface FetchHandler {
    readonly fetch: (request: Request) => Promise<Response>;
}

/**
 * The server entry could not be loaded: `vite build` has not written it yet,
 * or what it wrote is not a fetch handler.
 *
 * @since 1.0.0
 * @category Errors
 */
export class ServerEntryUnavailable extends Data.TaggedError("ServerEntryUnavailable")<{
    readonly url: string;
    readonly cause?: unknown;
}> {}

const isFetchModule = (module: unknown): module is { readonly default: FetchHandler } =>
    Predicate.hasProperty(module, "default") &&
    Predicate.hasProperty(module.default, "fetch") &&
    Predicate.isFunction(module.default.fetch);

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean => error.reason._tag === "RouteNotFound";

/** Identifies one build's `fetch.js`: a rebuild writes a new file, so any of these changes. */
const versionOf = (info: FileSystem.File.Info): string =>
    [
        Option.getOrElse(info.ino, () => 0n),
        Option.match(info.mtime, { onNone: () => 0, onSome: (mtime) => mtime.getTime() }),
        info.size,
    ].join("-");

/**
 * Mounts the application on the router.
 *
 * `dist` is the directory `vite build` wrote `client/` and `server/` into, as
 * a URL ending in `/`. `origin` is the public origin the application is
 * served from: request urls are resolved against it rather than against the
 * `Host` header, which the client controls, before the server entry sees them.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: { readonly dist: URL; readonly origin: Config.Config<string> }) =>
    Layer.effectDiscard(
        Effect.gen(function* () {
            const router = yield* HttpRouter.HttpRouter;
            const fileSystem = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const origin = new URL(yield* options.origin).origin;

            // No index: a directory is never answered from disk, so `/` and
            // every other route reach the server entry instead of a 301 to a
            // trailing slash or a stale `index.html`.
            const root = yield* path.fromFileUrl(new URL("client", options.dist));
            const staticFiles = yield* HttpStaticServer.make({ root, index: undefined });

            const handlerUrl = new URL("server/fetch.js", options.dist).href;
            const handlerPath = yield* path.fromFileUrl(new URL("server/fetch.js", options.dist));
            let loaded: { readonly version: string; readonly handler: FetchHandler } | undefined;

            const load = (version: string) =>
                Effect.tryPromise({
                    // The version in the query is what makes a rebuilt file a
                    // new module rather than the one already in the cache.
                    try: (): Promise<unknown> => import(`${handlerUrl}?build=${version}`),
                    catch: (cause) => new ServerEntryUnavailable({ url: handlerUrl, cause }),
                }).pipe(
                    Effect.flatMap((module) =>
                        isFetchModule(module)
                            ? Effect.succeed(module.default)
                            : Effect.fail(new ServerEntryUnavailable({ url: handlerUrl }))
                    ),
                    Effect.tap((handler) =>
                        Effect.sync(() => {
                            loaded = { version, handler };
                        })
                    )
                );

            // A rebuild in progress has deleted the file for a moment; the
            // handler already loaded serves until the new one lands.
            const fetchHandler = Effect.flatMap(Effect.option(fileSystem.stat(handlerPath)), (info) =>
                Option.match(info, {
                    onNone: () =>
                        loaded === undefined
                            ? Effect.fail(new ServerEntryUnavailable({ url: handlerUrl }))
                            : Effect.succeed(loaded.handler),
                    onSome: (info) => {
                        const version = versionOf(info);
                        return loaded?.version === version ? Effect.succeed(loaded.handler) : load(version);
                    },
                })
            );

            const renderPage = (request: HttpServerRequest.HttpServerRequest) =>
                Effect.gen(function* () {
                    const url = Server.resolveRequestUrl(request.url, origin);
                    if (url === undefined) return HttpServerResponse.empty({ status: 400 });

                    const handler = yield* fetchHandler;
                    const signal = yield* Effect.abortSignal;
                    // Built directly rather than through `HttpServerRequest.toWeb`,
                    // which derives the url from the `Host` header and fails the
                    // whole render on one that does not parse. Only GETs reach
                    // here, so there is no body to carry.
                    const webRequest = new Request(url, { method: request.method, headers: request.headers, signal });
                    const response = yield* Effect.promise(() => handler.fetch(webRequest));
                    return HttpServerResponse.fromWeb(response);
                }).pipe(
                    Effect.catch((error) =>
                        Effect.as(
                            Effect.logError("server render failed", error),
                            HttpServerResponse.text("This page could not be rendered.", { status: 503 })
                        )
                    )
                );

            yield* router.add(
                "GET",
                "/*",
                HttpServerRequest.HttpServerRequest.use((request) =>
                    staticFiles.pipe(
                        Effect.catch((error) =>
                            isRouteNotFound(error)
                                ? renderPage(request)
                                : // Not a file it can serve, for a reason other than
                                  // there being none (a path through a file, a name
                                  // too long): the app's own not-found page answers.
                                  Effect.andThen(Effect.logWarning("static lookup failed", error), renderPage(request))
                        )
                    )
                )
            );
        })
    );

/**
 * The one-card pages that are served outside the single page applications.
 *
 * A handful of pages cannot be SPA routes. The OIDC consent screen runs during
 * a third-party authorization, where the browser holds no access token for a
 * SPA to authenticate with; the Discord `/link` callback is a bare redirect
 * that lands on whichever device finished the round trip. They are rendered on
 * the server, and they are all the same card on the same sky-blue background.
 *
 * The shell and the stylesheet are real `.html` and `.css` files next to this
 * one, read once at module load. Foldkit refuses to render a view rooted at
 * `<html>`, `<head>` or `<body>` - a browser builds those from the document it
 * parses, so the served root would never be the element the view wrote - which
 * means the document shell has to be a template it splices into. It does not
 * have to be a string literal in a TypeScript file, though, and as its own
 * files these get syntax highlighting, formatting and an editor that
 * understands them.
 *
 * The stylesheet is served rather than inlined, so nothing here touches the
 * filesystem. It is still meant for a server: it renders documents and builds
 * http responses, and it is deliberately not re-exported from the package
 * index so a client bundle cannot reach it by accident.
 *
 * @since 1.0.0
 */

import { Effect, Option } from "effect";
import { Headers, HttpServerResponse } from "effect/unstable/http";

import type { Document, Html, HtmlBuilder } from "foldkit/html";

import * as Server from "foldkit/experimental/server";

/**
 * Where the stylesheet is expected to be served from.
 *
 * A served file rather than an inlined blob: the shell stays small, the css
 * stays a real `.css` file with an editor that understands it, and a visitor
 * who sees two of these pages downloads it once. The cost is that every app
 * rendering a standalone page has to answer this path - see
 * {@link stylesheetFile}.
 *
 * @since 1.0.0
 * @category Styles
 */
export const STYLESHEET_HREF = "/standalone.css";

/**
 * The stylesheet on disk, for an app to serve at {@link STYLESHEET_HREF}.
 *
 * A `URL` rather than a read: resolving it costs nothing and leaves the
 * decision about how to serve a file to the server that has an http layer,
 * rather than making this module reach for the filesystem at import time.
 *
 * @since 1.0.0
 * @category Styles
 */
export const stylesheetFile = new URL("./StandalonePage.css", import.meta.url);

/**
 * The document shell.
 *
 * Foldkit refuses to render a view rooted at `<html>`, `<head>` or `<body>` -
 * a browser builds those from the document it parses, so the served root would
 * never be the element the view wrote - so the shell has to be a template it
 * splices into. With the stylesheet served separately there is little left of
 * it, which is the point.
 *
 * `<title>` and `<html lang>` are placeholders; Foldkit overwrites both from
 * the rendered `Document` and needs them present to have somewhere to write.
 */
const template = (options: { readonly favicon: boolean }): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title></title>
${options.favicon ? '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n' : ""}<link rel="stylesheet" href="${STYLESHEET_HREF}" />
</head>
<body>
<div id="root"></div>
</body>
</html>`;

/**
 * The card every standalone page sits in.
 *
 * `centered` is for a card that is only a heading and a sentence; one with a
 * list or a form left-aligns its content and centers the parts it chooses.
 *
 * @since 1.0.0
 * @category Views
 */
export const card = (
    h: HtmlBuilder<never>,
    options: { readonly centered?: boolean },
    children: ReadonlyArray<Html>
): Html => h.main([h.Class(options.centered === true ? "card centered" : "card")], children);

/**
 * The lead line under a heading, when the card carries more below it.
 *
 * @since 1.0.0
 * @category Views
 */
export const lead = (h: HtmlBuilder<never>, text: string): Html => h.p([h.Class("lead")], [text]);

/**
 * A footnote under everything else, such as where a form will send you.
 *
 * @since 1.0.0
 * @category Views
 */
export const footnote = (h: HtmlBuilder<never>, text: string): Html => h.p([h.Class("footnote")], [text]);

/**
 * The list of things a page is asking the visitor to agree to.
 *
 * @since 1.0.0
 * @category Views
 */
export const permissions = (h: HtmlBuilder<never>, items: ReadonlyArray<string>): Html =>
    h.ul(
        [h.Class("permissions")],
        items.map((item) => h.li([], [`✅ ${item}`]))
    );

/**
 * A form of submit buttons, one per answer.
 *
 * Every standalone page that asks anything asks it as a plain form post, so
 * that the page works with scripting turned off. `name` and `value` are what
 * tell the handler which button was pressed.
 *
 * @since 1.0.0
 * @category Views
 */
export const actions = (
    h: HtmlBuilder<never>,
    options: {
        readonly action: string;
        readonly hidden?: Readonly<Record<string, string>> | undefined;
        readonly name: string;
        readonly buttons: ReadonlyArray<{
            readonly value: string;
            readonly label: string;
            readonly variant: "primary" | "secondary";
        }>;
    }
): Html =>
    h.form(
        [h.Method("post"), h.Action(options.action), h.Class("actions")],
        [
            ...Object.entries(options.hidden ?? {}).map(([name, value]) =>
                h.input([h.Type("hidden"), h.Name(name), h.Value(value)])
            ),
            ...options.buttons.map((button) =>
                h.button(
                    [h.Class(button.variant), h.Type("submit"), h.Name(options.name), h.Value(button.value)],
                    [button.label]
                )
            ),
        ]
    );

/**
 * Renders a standalone page to a complete HTML document.
 *
 * Always a static render. Every page built on this is a heading, some text and
 * at most a form of submit buttons, so there is nothing for a client runtime to
 * do: no hydration stamp, no Flags payload, no bundle, and identical behaviour
 * with scripting turned off.
 *
 * A render failure means the view produced markup the HTML parser would
 * reshape, which is a bug in that view rather than a condition the request
 * could recover from, so it is a defect.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const render = <Model>(options: {
    readonly model: Model;
    readonly view: (model: Model, h: HtmlBuilder<never>) => Document;
    readonly favicon?: boolean | undefined;
}): Effect.Effect<string> =>
    Server.renderToString(
        { init: () => [options.model, []] as const, view: options.view },
        { isHydratable: false }
    ).pipe(
        Effect.map((rendered) => Server.injectIntoTemplate(template({ favicon: options.favicon ?? false }), rendered)),
        Effect.orDie
    );

/**
 * A page that is a heading and a sentence, and nothing else.
 *
 * The shape every outcome page ends up being: a refusal, a confirmation, a
 * "that link has expired". Both fields are plain text, and the view is what
 * turns them into markup - which is also what escapes them.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Notice {
    /** Stamped on `<html lang>`, so a screen reader announces the right language. */
    readonly language: string;
    readonly title: string;
    readonly body: string;
}

/**
 * @since 1.0.0
 * @category Views
 */
export const noticeView = (notice: Notice, h: HtmlBuilder<never>): Document => ({
    title: `${notice.title} | Tinyburg`,
    lang: notice.language,
    body: card(h, { centered: true }, [h.h1([], [notice.title]), h.p([], [notice.body])]),
});

/**
 * Renders a heading-and-a-sentence page.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const renderNotice = (
    notice: Notice,
    options?: { readonly favicon?: boolean | undefined }
): Effect.Effect<string> => render({ model: notice, view: noticeView, favicon: options?.favicon ?? false });

/**
 * The request header these pages choose their content by.
 *
 * They pick their language from `Accept-Language`, so two visitors asking for
 * the same URL get different bytes. A shared cache that does not know the
 * response depends on that header is free to hand one visitor's language - or,
 * on the Discord callback, one visitor's display name - to the next person who
 * asks.
 *
 * Only this one. `Accept` is not in here: every route built on this answers
 * HTML whatever the client asked for, so naming `Accept` would key caches on a
 * header the content does not depend on. Foldkit's {@link Server.varyWithAccept}
 * is for a host that negotiates with {@link Server.acceptsHtml} and serves
 * something else when the answer is no, which none of these do.
 */
const VARY_ON = "accept-language";

/**
 * Declares the request header the response varies on.
 *
 * Merged into whatever `vary` the response already carries rather than
 * assigned, through Foldkit's `varyWith`. Assigning is what drops the fields
 * already there, and a dropped field reads exactly like a dependency nobody
 * had - which is the bug that makes a shared cache hand one visitor another's
 * page. `varyWith` owns the parse: a comma-separated, case-insensitive list
 * where `*` already varies on everything, a name is not duplicated, and
 * `Accept-Language` is distinct from the shorter `Accept` it starts with.
 */
const varyOnLanguage = (response: HttpServerResponse.HttpServerResponse): HttpServerResponse.HttpServerResponse =>
    HttpServerResponse.setHeader(
        response,
        "vary",
        Server.varyWith(Option.getOrUndefined(Headers.get(response.headers, "vary")), VARY_ON)
    );

/**
 * Renders a standalone page and wraps it in a response.
 *
 * Preferred over calling {@link render} and building the response by hand. The
 * caching headers are a property of how these pages choose their content, not a
 * decision each route should be making again: `no-store`, because every page
 * built on this is about one visitor's one request - an authorization they are
 * deciding on, a link that was just made, a refusal for a request that has
 * already been answered - none of it worth keeping and some of it worth not
 * keeping; and `vary`, per {@link VARY_ON}.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const respond = <Model>(options: {
    readonly model: Model;
    readonly view: (model: Model, h: HtmlBuilder<never>) => Document;
    readonly favicon?: boolean | undefined;
    readonly status?: number | undefined;
}): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
    render(options).pipe(
        Effect.map((html) =>
            HttpServerResponse.html(html).pipe(
                HttpServerResponse.setStatus(options.status ?? 200),
                HttpServerResponse.setHeader("cache-control", "no-store"),
                varyOnLanguage
            )
        )
    );

/**
 * Renders a heading-and-a-sentence page and wraps it in a response.
 *
 * @since 1.0.0
 * @category Rendering
 */
export const respondNotice = (
    notice: Notice,
    options?: { readonly favicon?: boolean | undefined; readonly status?: number | undefined }
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
    respond({
        model: notice,
        view: noticeView,
        favicon: options?.favicon ?? false,
        ...(options?.status === undefined ? {} : { status: options.status }),
    });

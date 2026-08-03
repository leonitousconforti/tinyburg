import type { Html, HtmlBuilder } from "foldkit/html";

/** The drifting cloud background. Rendered once in the app shell so the
 *  animation keeps its place across route changes. */
export const clouds = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("clouds")],
        [
            h.div([h.Class("cloud cloud-1")], []),
            h.div([h.Class("cloud cloud-2")], []),
            h.div([h.Class("cloud cloud-3")], []),
        ]
    );

/** The absolute top-left pill used on app pages (login, towers, developer apps). */
export const appBackLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "font-pixel bg-dark-blue/80 shadow-pixel hover:shadow-pixel-hover absolute top-8 left-8 rounded px-4 py-3 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [label]
    );

/** The fixed top-left pill used on article pages (about, privacy, terms, ...). */
export const articleBackLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "bg-dark-blue/95 font-pixel shadow-pixel hover:shadow-pixel-hover fixed top-4 left-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[0.5rem] text-white backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 sm:top-6 sm:left-6 sm:px-4 sm:py-2.5 sm:text-[0.6rem]"
            ),
        ],
        [h.span([h.AriaHidden(true)], ["←"]), h.span([], [label])]
    );

/** A bullet list item with the sky-dark dot marker used by privacy and terms. */
export const bullet = <M>(h: HtmlBuilder<M>, children: ReadonlyArray<Html | string>): Html =>
    h.li(
        [h.Class("flex items-start gap-3 text-lg leading-relaxed sm:text-xl")],
        [
            h.span([h.Class("bg-sky-dark mt-2.5 size-1.5 shrink-0 rounded-full"), h.AriaHidden(true)], []),
            h.span([], children),
        ]
    );

/** Section heading inside an article card. */
export const articleHeading = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.h2([h.Class("font-pixel text-dark-blue mb-4 text-[0.55rem] leading-relaxed sm:text-[0.7rem]")], [text]);

/**
 * The shared page furniture: cards, buttons, banners, and the navigation
 * pills every tinyburg app wears. Views are generic over the app's message
 * type, so a component that emits nothing composes into any page.
 *
 * @since 1.0.0
 */

import type { Html, HtmlBuilder } from "foldkit/html";

/**
 * The card every section of every page sits in.
 *
 * @since 1.0.0
 * @category Classes
 */
export const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

/**
 * The one button per view that moves things forward.
 *
 * @since 1.0.0
 * @category Classes
 */
export const primaryButton =
    "font-pixel bg-sky-dark shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg px-4 py-3 text-[0.6rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

/**
 * A full-size button for actions that are safe to click.
 *
 * @since 1.0.0
 * @category Classes
 */
export const quietButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[0.6rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

/**
 * A compact button for destructive actions; red enough to slow a reader down.
 *
 * @since 1.0.0
 * @category Classes
 */
export const dangerButton =
    "font-pixel shrink-0 rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-[0.55rem] text-red-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-red-500 disabled:pointer-events-none disabled:opacity-50";

/**
 * A compact button for the per-row actions in a list.
 *
 * @since 1.0.0
 * @category Classes
 */
export const smallButton =
    "font-pixel shrink-0 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-[0.55rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-sky-blue disabled:pointer-events-none disabled:opacity-50";

/**
 * A status or problem line above the page content. Notices are announced
 * politely; problems interrupt.
 *
 * @since 1.0.0
 * @category Views
 */
export const banner = <M>(h: HtmlBuilder<M>, tone: "notice" | "problem", text: string): Html =>
    h.p(
        [
            h.Role(tone === "notice" ? "status" : "alert"),
            h.Class(
                tone === "notice"
                    ? "font-mono border-sky-blue bg-sky-light/40 text-sky-dark rounded-lg border-2 px-4 py-3 text-lg"
                    : "font-mono rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-700"
            ),
        ],
        [text]
    );

/**
 * The absolute top-left pill used on app pages.
 *
 * `back-link` names it for the View Transition API: when both the outgoing
 * and incoming page carry a back link the browser slides the one pill between
 * their two positions instead of fading it out and another one in. Exactly
 * one of these renders per page, which is what the name requires.
 *
 * @since 1.0.0
 * @category Views
 */
export const appBackLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "back-link font-pixel bg-dark-blue/80 shadow-pixel hover:shadow-pixel-hover absolute top-8 left-8 rounded px-4 py-3 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [label]
    );

/**
 * The fixed top-left pill used on article pages (about, privacy, terms, ...).
 * Shares the `back-link` transition name with {@link appBackLink}.
 *
 * @since 1.0.0
 * @category Views
 */
export const articleBackLink = <M>(h: HtmlBuilder<M>, href: string, label: string): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "back-link bg-dark-blue/95 font-pixel shadow-pixel hover:shadow-pixel-hover fixed top-4 left-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[0.5rem] text-white backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 sm:top-6 sm:left-6 sm:px-4 sm:py-2.5 sm:text-[0.6rem]"
            ),
        ],
        [h.span([h.AriaHidden(true)], ["←"]), h.span([], [label])]
    );

/**
 * A bullet list item with the sky-dark dot marker.
 *
 * @since 1.0.0
 * @category Views
 */
export const bullet = <M>(h: HtmlBuilder<M>, children: ReadonlyArray<Html | string>): Html =>
    h.li(
        [h.Class("flex items-start gap-3 text-lg leading-relaxed sm:text-xl")],
        [
            h.span([h.Class("bg-sky-dark mt-2.5 size-1.5 shrink-0 rounded-full"), h.AriaHidden(true)], []),
            h.span([], children),
        ]
    );

/**
 * Section heading inside an article card.
 *
 * @since 1.0.0
 * @category Views
 */
export const articleHeading = <M>(h: HtmlBuilder<M>, text: string): Html =>
    h.h2([h.Class("font-pixel text-dark-blue mb-4 text-[0.55rem] leading-relaxed sm:text-[0.7rem]")], [text]);

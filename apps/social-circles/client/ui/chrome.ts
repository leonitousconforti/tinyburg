import type { Html, HtmlBuilder } from "foldkit/html";

/** The card every section of every page sits in. */
export const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

export const primaryButton =
    "font-pixel bg-sky-dark shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg px-4 py-3 text-[0.6rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

export const quietButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[0.6rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

export const dangerButton =
    "font-pixel shrink-0 rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-[0.55rem] text-red-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-red-500 disabled:pointer-events-none disabled:opacity-50";

/** The absolute top-left pill used on app pages. */
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

/** A status or problem line above the page content. */
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

/** The Tinyburg mark used on the sign-in button. */
export const towerIcon = <M>(h: HtmlBuilder<M>, className: string): Html =>
    h.svg(
        [h.ViewBox("0 0 24 24"), h.Class(className), h.AriaHidden(true)],
        [
            h.path([h.Fill("currentColor"), h.D("M6 22V8h12v14h-5v-4h-2v4H6Z")], []),
            h.path([h.Fill("currentColor"), h.D("M8 6V3h8v3H8Z")], []),
            h.path([h.Fill("#ffd700"), h.D("M9 10h2v2H9v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2H9v-2Zm4 0h2v2h-2v-2Z")], []),
        ]
    );

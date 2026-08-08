import type { NotFoundMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

export const notFoundView = <M>(h: HtmlBuilder<M>, msgs: NotFoundMessages, shared: SharedMessages): Html =>
    h.main(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center")],
        [
            h.div(
                [h.Class("tower tower--404 mb-10"), h.AriaHidden(true)],
                [
                    h.div([h.Class("floor roof")], ["🏗️"]),
                    h.div([h.Class("floor food")], [shared.floors.food]),
                    h.div([h.Class("floor missing")], ["404"]),
                    h.div([h.Class("floor recreation")], [shared.floors.recreation]),
                    h.div([h.Class("floor lobby")], [shared.floors.lobby]),
                ]
            ),
            h.h1(
                [
                    h.Class(
                        "font-pixel text-xl leading-relaxed text-white drop-shadow-[3px_3px_0_var(--color-dark-blue)] sm:text-3xl"
                    ),
                ],
                [msgs.heading]
            ),
            h.p(
                [h.Class("mt-4 max-w-md text-xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)] sm:text-2xl")],
                [msgs.body]
            ),
            h.div(
                [h.Class("mt-10 flex flex-wrap justify-center gap-4")],
                [
                    h.a(
                        [
                            h.Href("/"),
                            h.Class(
                                "font-pixel bg-gold text-dark-blue shadow-pixel hover:shadow-pixel-hover px-8 py-4 text-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ffe44d]"
                            ),
                        ],
                        [msgs.goHome]
                    ),
                    h.button(
                        [
                            h.Attribute("onclick", "history.back()"),
                            h.Class(
                                "font-pixel shadow-pixel hover:shadow-pixel-hover border-3 cursor-pointer border-white bg-transparent px-8 py-4 text-sm text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white/10"
                            ),
                        ],
                        [msgs.goBack]
                    ),
                ]
            ),
        ]
    );

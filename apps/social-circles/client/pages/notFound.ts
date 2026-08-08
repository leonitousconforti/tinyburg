import type { NotFoundMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { card } from "../ui/chrome.ts";

export const notFoundView = <M>(h: HtmlBuilder<M>, msgs: NotFoundMessages): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            h.div(
                [h.Class(card + " max-w-md text-center")],
                [
                    h.h1([h.Class("font-pixel text-dark-blue mb-4 text-lg")], [msgs.heading]),
                    h.p([h.Class("font-mono mb-6 text-xl text-gray-600")], [msgs.body]),
                    h.a(
                        [
                            h.Href("/"),
                            h.Class(
                                "bg-dark-blue shadow-pixel hover:shadow-pixel-hover font-pixel inline-block rounded-lg px-6 py-4 text-[0.7rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                            ),
                        ],
                        [msgs.backToLobby]
                    ),
                ]
            ),
        ]
    );

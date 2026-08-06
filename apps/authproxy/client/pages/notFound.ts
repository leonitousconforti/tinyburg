import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink, card } from "@tinyburg/ui/Chrome";

export const notFoundView = <M>(h: HtmlBuilder<M>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/", "← Back to Home"),
            h.div(
                [h.Class(card + " max-w-md text-center")],
                [
                    h.h1([h.Class("font-pixel mb-4 text-lg text-gray-800")], ["404"]),
                    h.p([h.Class("font-mono text-xl text-gray-600")], ["This floor hasn't been built yet."]),
                ]
            ),
        ]
    );

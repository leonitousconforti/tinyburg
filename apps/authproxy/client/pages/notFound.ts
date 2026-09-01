import type { NotFoundMessages, SharedMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appBackLink, card } from "@tinyburg/shared-ui/Chrome";

export const notFoundView = <M>(h: HtmlBuilder<M>, msgs: NotFoundMessages, shared: SharedMessages): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            appBackLink(h, "/", shared.backToHome),
            h.div(
                [h.Class(card + " max-w-md text-center")],
                [
                    h.h1([h.Class("font-pixel mb-4 text-lg text-gray-800")], [msgs.heading]),
                    h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.body]),
                ]
            ),
        ]
    );

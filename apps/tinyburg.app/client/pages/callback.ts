import { Option } from "effect";

import type { Html, HtmlBuilder } from "foldkit/html";

/**
 * The landing spot of the code flow. It normally shows for a blink before the
 * token exchange finishes and the router moves on, so it only has to say
 * something useful when sign in failed.
 */
export const callbackView = <M>(h: HtmlBuilder<M>, error: Option.Option<string>): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center justify-center p-8")],
        [
            h.div(
                [
                    h.Class(
                        "bg-card-bg shadow-pixel-hover border-gold w-full max-w-md rounded-2xl border-3 p-8 text-center"
                    ),
                ],
                Option.match(error, {
                    onNone: () => [
                        h.span([h.Class("mb-4 block text-5xl")], ["🔐"]),
                        h.p([h.Class("font-mono text-xl text-gray-600")], ["Signing you in..."]),
                    ],
                    onSome: (message) => [
                        h.span([h.Class("mb-4 block text-5xl")], ["🚧"]),
                        h.h1([h.Class("font-pixel mb-2 text-lg text-gray-800")], ["Sign in failed"]),
                        h.p([h.Class("font-mono text-xl text-gray-600")], [message]),
                        h.a(
                            [
                                h.Href("/"),
                                h.Class(
                                    "font-pixel bg-gold shadow-pixel hover:shadow-pixel-hover mt-6 inline-block rounded-lg px-6 py-4 text-[0.7rem] text-gray-800 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                ),
                            ],
                            ["Back to Tinyburg"]
                        ),
                    ],
                })
            ),
        ]
    );
